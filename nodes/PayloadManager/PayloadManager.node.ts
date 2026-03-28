import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class PayloadManager implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Payload Manager',
        name: 'invokatiPayloadManager',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Create, update, retrieve, approve, or deny custom payloads in Invokati. Use with human-in-the-loop workflows that need dashboard review before continuing.',
        defaults: {
            name: 'Invokati Payload Manager',
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
                        name: 'Create Payload',
                        value: 'create',
                        description: 'Create a new custom payload',
                        action: 'Create a payload',
                    },
                    {
                        name: 'Update Payload',
                        value: 'update',
                        description: 'Update an existing payload',
                        action: 'Update a payload',
                    },
                    {
                        name: 'Get Payload',
                        value: 'get',
                        description: 'Retrieve a payload by ID',
                        action: 'Get a payload',
                    },
                    {
                        name: 'Approve',
                        value: 'approve',
                        description: 'Approve a pending payload and optionally resume the workflow',
                        action: 'Approve a payload',
                    },
                    {
                        name: 'Deny',
                        value: 'deny',
                        description: 'Deny a pending payload and optionally resume the workflow',
                        action: 'Deny a payload',
                    },
                    {
                        name: 'Delete Payload',
                        value: 'delete',
                        description: 'Permanently delete a payload by ID',
                        action: 'Delete a payload',
                    },
                ],
                default: 'create',
            },

            // Payload ID — update, get, approve, deny, delete
            {
                displayName: 'Payload ID',
                name: 'payloadId',
                type: 'string',
                default: '',
                required: true,
                description: 'The Invokati payload ID',
                displayOptions: {
                    show: {
                        operation: ['update', 'get', 'approve', 'deny', 'delete'],
                    },
                },
            },

            // Title — create (required)
            {
                displayName: 'Title',
                name: 'title',
                type: 'string',
                default: '',
                required: true,
                description: 'A human-readable label for this payload',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Task Type — create
            {
                displayName: 'Task Type',
                name: 'taskType',
                type: 'options',
                options: [
                    { name: 'Generic', value: 'generic' },
                    { name: 'Lead', value: 'lead' },
                    { name: 'Media', value: 'media' },
                    { name: 'Content Review', value: 'content-review' },
                ],
                default: 'generic',
                description: 'Categorises the payload for filtering in the dashboard',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Payload JSON — create
            {
                displayName: 'Payload Data',
                name: 'payloadData',
                type: 'json',
                default: '{}',
                description: 'The JSON payload to store. This is the arbitrary data your workflow produces.',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Requires Human Review — create
            {
                displayName: 'Requires Human Review',
                name: 'humanInteraction',
                type: 'boolean',
                default: false,
                description: 'When true, the payload appears in the dashboard review queue and the workflow pauses at a Wait node until a team member approves or denies it.',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Resume URL — create (shown when humanInteraction is true)
            {
                displayName: 'Resume URL',
                name: 'resumeUrl',
                type: 'string',
                default: '',
                placeholder: '={{ $execution.resumeUrl }}',
                description: 'The n8n Wait node webhook URL. When the payload is approved or denied in Invokati, this URL is called to resume the workflow. Use {{ $execution.resumeUrl }} from a Wait node.',
                displayOptions: {
                    show: {
                        operation: ['create'],
                        humanInteraction: [true],
                    },
                },
            },

            // Allow Regenerate — create
            {
                displayName: 'Allow Regenerate',
                name: 'allowRegenerate',
                type: 'boolean',
                default: false,
                description: 'Show a "Regenerate" button in the dashboard alongside Approve/Deny',
                displayOptions: {
                    show: {
                        operation: ['create'],
                        humanInteraction: [true],
                    },
                },
            },

            // Notes — approve, deny
            {
                displayName: 'Notes',
                name: 'notes',
                type: 'string',
                typeOptions: { rows: 3 },
                default: '',
                description: 'Optional reviewer notes attached to the approval or denial',
                displayOptions: {
                    show: {
                        operation: ['approve', 'deny'],
                    },
                },
            },

            // Update fields — update only
            {
                displayName: 'Fields to Update',
                name: 'updateFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: {
                        operation: ['update'],
                    },
                },
                options: [
                    {
                        displayName: 'Title',
                        name: 'title',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Payload Data',
                        name: 'payload',
                        type: 'json',
                        default: '{}',
                    },
                    {
                        displayName: 'Status',
                        name: 'status',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Automation Status',
                        name: 'automation_status',
                        type: 'options',
                        options: [
                            { name: 'Pending', value: 'pending' },
                            { name: 'Approved', value: 'approved' },
                            { name: 'Denied', value: 'denied' },
                        ],
                        default: 'pending',
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
                    const title = this.getNodeParameter('title', i) as string;
                    const taskType = this.getNodeParameter('taskType', i) as string;
                    const payloadData = this.getNodeParameter('payloadData', i) as string;
                    const humanInteraction = this.getNodeParameter('humanInteraction', i) as boolean;
                    const resumeUrl = humanInteraction ? this.getNodeParameter('resumeUrl', i) as string : '';
                    const allowRegenerate = humanInteraction ? this.getNodeParameter('allowRegenerate', i) as boolean : false;

                    const body: Record<string, any> = {
                        title,
                        task_type: taskType,
                        payload: typeof payloadData === 'string' ? payloadData : JSON.stringify(payloadData),
                        human_interaction: humanInteraction,
                        allow_regenerate: allowRegenerate,
                        workflow_id: this.getWorkflow().id,
                        execution_id: this.getExecutionId(),
                    };
                    if (resumeUrl) body.resume_url = resumeUrl;

                    response = await this.helpers.request({
                        method: 'POST' as IHttpRequestMethods,
                        uri: `${baseUrl}/automation/payload/create`,
                        headers,
                        body,
                        json: true,
                    });

                } else if (operation === 'update') {
                    const payloadId = this.getNodeParameter('payloadId', i) as string;
                    const updateFields = this.getNodeParameter('updateFields', i) as Record<string, any>;

                    if (updateFields.payload && typeof updateFields.payload !== 'string') {
                        updateFields.payload = JSON.stringify(updateFields.payload);
                    }

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/payloads/${payloadId}`,
                        headers,
                        body: updateFields,
                        json: true,
                    });

                } else if (operation === 'get') {
                    const payloadId = this.getNodeParameter('payloadId', i) as string;

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/payloads/${payloadId}`,
                        headers,
                        json: true,
                    });

                } else if (operation === 'approve' || operation === 'deny') {
                    const payloadId = this.getNodeParameter('payloadId', i) as string;
                    const notes = this.getNodeParameter('notes', i) as string;

                    response = await this.helpers.request({
                        method: 'POST' as IHttpRequestMethods,
                        uri: `${baseUrl}/automation/${operation}`,
                        headers,
                        body: {
                            entity_type: 'custom_payload',
                            entity_id: payloadId,
                            notes,
                        },
                        json: true,
                    });

                } else if (operation === 'delete') {
                    const payloadId = this.getNodeParameter('payloadId', i) as string;

                    response = await this.helpers.request({
                        method: 'DELETE' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/payloads/${payloadId}`,
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
