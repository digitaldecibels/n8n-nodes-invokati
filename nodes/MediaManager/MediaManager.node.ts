import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class MediaManager implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Media Manager',
        name: 'invokatiMediaManager',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Create, update, and retrieve media items in your Invokati Media Hub',
        defaults: {
            name: 'Invokati Media Manager',
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
                        name: 'Create Media Item',
                        value: 'create',
                        description: 'Add a new media item to the hub',
                        action: 'Create a media item',
                    },
                    {
                        name: 'Update Media Item',
                        value: 'update',
                        description: 'Update an existing media item',
                        action: 'Update a media item',
                    },
                    {
                        name: 'Get Media Item',
                        value: 'get',
                        description: 'Retrieve a media item by ID',
                        action: 'Get a media item',
                    },
                    {
                        name: 'List Media Items',
                        value: 'list',
                        description: 'List media items with optional filters',
                        action: 'List media items',
                    },
                ],
                default: 'create',
            },

            // Media ID — update, get
            {
                displayName: 'Media ID',
                name: 'mediaId',
                type: 'string',
                default: '',
                required: true,
                description: 'The Invokati media item ID',
                displayOptions: {
                    show: {
                        operation: ['update', 'get'],
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
                description: 'Display name for this media item',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Media Type — create (required)
            {
                displayName: 'Media Type',
                name: 'mediaType',
                type: 'options',
                options: [
                    { name: 'Video', value: 'video' },
                    { name: 'Image', value: 'image' },
                    { name: 'Audio', value: 'audio' },
                    { name: 'File', value: 'file' },
                ],
                default: 'video',
                required: true,
                description: 'The type of media being added',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Source URL — create (required)
            {
                displayName: 'Source URL',
                name: 'sourceUrl',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'https://drive.google.com/file/d/... or https://youtu.be/...',
                description: 'URL of the media. Supports Google Drive, Dropbox, YouTube, Vimeo, S3, and more — source type is auto-detected.',
                displayOptions: {
                    show: {
                        operation: ['create'],
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
                        displayName: 'Collection Name',
                        name: 'collection',
                        type: 'string',
                        default: '',
                        description: 'Collection to assign this item to. Created automatically if it does not exist.',
                    },
                    {
                        displayName: 'Status',
                        name: 'status',
                        type: 'string',
                        default: '',
                        description: 'Item status (e.g. active, archived)',
                    },
                    {
                        displayName: 'Automation Status',
                        name: 'automation_status',
                        type: 'options',
                        options: [
                            { name: 'Pending Review', value: 'pending' },
                            { name: 'Approved', value: 'approved' },
                            { name: 'Denied', value: 'denied' },
                        ],
                        default: 'pending',
                    },
                    {
                        displayName: 'Requires Human Review',
                        name: 'human_interaction',
                        type: 'boolean',
                        default: false,
                        description: 'When true, the item appears in the review queue and the workflow pauses until approved.',
                    },
                    {
                        displayName: 'Allow Regenerate',
                        name: 'allow_regenerate',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        displayName: 'Resume URL',
                        name: 'resume_url',
                        type: 'string',
                        default: '',
                        description: 'n8n Wait node webhook URL to call when the item is approved or denied.',
                    },
                    {
                        displayName: 'Workflow ID',
                        name: 'workflow_id',
                        type: 'string',
                        default: '={{ $workflow.id }}',
                    },
                    {
                        displayName: 'Execution ID',
                        name: 'execution_id',
                        type: 'string',
                        default: '={{ $execution.id }}',
                    },
                ],
            },

            // List filters
            {
                displayName: 'Filters',
                name: 'filters',
                type: 'collection',
                placeholder: 'Add Filter',
                default: {},
                displayOptions: {
                    show: {
                        operation: ['list'],
                    },
                },
                options: [
                    {
                        displayName: 'Media Type',
                        name: 'media_type',
                        type: 'options',
                        options: [
                            { name: 'All', value: '' },
                            { name: 'Video', value: 'video' },
                            { name: 'Image', value: 'image' },
                            { name: 'Audio', value: 'audio' },
                            { name: 'File', value: 'file' },
                        ],
                        default: '',
                    },
                    {
                        displayName: 'Limit',
                        name: 'limit',
                        type: 'number',
                        default: 50,
                        typeOptions: { minValue: 1, maxValue: 500 },
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
                    const mediaType = this.getNodeParameter('mediaType', i) as string;
                    const sourceUrl = this.getNodeParameter('sourceUrl', i) as string;
                    const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                    const body: Record<string, any> = {
                        title,
                        media_type: mediaType,
                        source_url: sourceUrl,
                        workflow_id: additional.workflow_id || this.getWorkflow().id,
                        execution_id: additional.execution_id || this.getExecutionId(),
                    };

                    const skip = new Set(['workflow_id', 'execution_id']);
                    for (const [k, v] of Object.entries(additional)) {
                        if (!skip.has(k)) body[k] = v;
                    }

                    response = await this.helpers.request({
                        method: 'POST' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/media`,
                        headers,
                        body,
                        json: true,
                    });

                } else if (operation === 'update') {
                    const mediaId = this.getNodeParameter('mediaId', i) as string;
                    const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/media/${mediaId}`,
                        headers,
                        body: additional,
                        json: true,
                    });

                } else if (operation === 'get') {
                    const mediaId = this.getNodeParameter('mediaId', i) as string;

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/media/${mediaId}`,
                        headers,
                        json: true,
                    });

                } else if (operation === 'list') {
                    const filters = this.getNodeParameter('filters', i) as Record<string, any>;
                    const params = new URLSearchParams();
                    if (filters.media_type) params.set('media_type', filters.media_type);
                    if (filters.limit) params.set('limit', String(filters.limit));

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/media/list?${params.toString()}`,
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
