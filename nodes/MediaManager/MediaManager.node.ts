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
                        description: 'Add a new media item by URL (Google Drive, Dropbox, YouTube, S3, etc.)',
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
                    {
                        name: 'Delete Media Item',
                        value: 'delete',
                        description: 'Permanently delete a media item by ID',
                        action: 'Delete a media item',
                    },
                ],
                default: 'create',
            },

            // Media ID — update, get, delete
            {
                displayName: 'Media ID',
                name: 'mediaId',
                type: 'string',
                default: '',
                required: true,
                description: 'The Invokati media item ID',
                displayOptions: {
                    show: {
                        operation: ['update', 'get', 'delete'],
                    },
                },
            },

            // Input type selector — create
            {
                displayName: 'Input Type',
                name: 'inputType',
                type: 'options',
                options: [
                    {
                        name: 'Link (URL)',
                        value: 'link',
                        description: 'Provide a URL — Google Drive, Dropbox, YouTube, Vimeo, S3, etc.',
                    },
                    {
                        name: 'Upload Binary',
                        value: 'upload',
                        description: 'Send a binary file from a previous node',
                    },
                ],
                default: 'link',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        operation: ['create'],
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

            // Media Type — create, link only (uploads auto-detect)
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
                        inputType: ['link'],
                    },
                },
            },

            // URL — create, link only (required)
            {
                displayName: 'URL',
                name: 'sourceUrl',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'https://drive.google.com/file/d/... or https://youtu.be/...',
                description: 'URL of the media. Supports Google Drive, Dropbox, YouTube, Vimeo, S3, and more — source type is auto-detected.',
                displayOptions: {
                    show: {
                        operation: ['create'],
                        inputType: ['link'],
                    },
                },
            },

            // Binary property name — create, upload only (required)
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                description: 'Name of the binary property on this item to upload. Media type, MIME type, and dimensions are auto-detected.',
                displayOptions: {
                    show: {
                        operation: ['create'],
                        inputType: ['upload'],
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
                        name: 'collection_name',
                        type: 'string',
                        default: '',
                        description: 'Collection to assign this item to. Created automatically if it does not exist.',
                    },
                    {
                        displayName: 'Description',
                        name: 'description',
                        type: 'string',
                        default: '',
                        typeOptions: { rows: 3 },
                    },
                    {
                        displayName: 'Tags',
                        name: 'tags',
                        type: 'string',
                        default: '',
                        description: 'Comma-separated tags',
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
                        displayName: 'Resume URL Override',
                        name: 'resume_url',
                        type: 'string',
                        default: '',
                        description: 'Override the auto-detected resume URL. Leave blank to use $execution.resumeUrl automatically.',
                    },
                    {
                        displayName: 'Thumbnail URL',
                        name: 'thumbnail_url',
                        type: 'string',
                        default: '',
                        description: 'Override the auto-detected thumbnail URL',
                    },
                    {
                        displayName: 'Embed URL',
                        name: 'embed_url',
                        type: 'string',
                        default: '',
                        description: 'Override the auto-detected embed URL (e.g. for iframes)',
                    },
                    {
                        displayName: 'Download URL',
                        name: 'download_url',
                        type: 'string',
                        default: '',
                        description: 'Override the auto-detected direct download URL',
                    },
                    {
                        displayName: 'Duration',
                        name: 'duration',
                        type: 'string',
                        default: '',
                        description: 'Media duration (e.g. "1:23:45" or "83s")',
                    },
                    {
                        displayName: 'File Size',
                        name: 'file_size',
                        type: 'string',
                        default: '',
                        description: 'Human-readable file size (e.g. "4.2 MB")',
                    },
                    {
                        displayName: 'MIME Type',
                        name: 'mime_type',
                        type: 'string',
                        default: '',
                        placeholder: 'video/mp4',
                    },
                    {
                        displayName: 'Width (px)',
                        name: 'width',
                        type: 'number',
                        default: 0,
                    },
                    {
                        displayName: 'Height (px)',
                        name: 'height',
                        type: 'number',
                        default: 0,
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

        const jsonHeaders = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' };

        for (let i = 0; i < items.length; i++) {
            try {
                let response: any;

                if (operation === 'create') {
                    const inputType = this.getNodeParameter('inputType', i) as string;
                    const title = this.getNodeParameter('title', i) as string;
                    const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                    // Always auto-detect from execution context; additionalFields can override.
                    const workflowId = String(this.getWorkflow().id);
                    const executionId = String(this.getExecutionId());
                    let resumeUrl = '';
                    try {
                        resumeUrl = String(this.evaluateExpression('={{ $execution.resumeUrl }}', i) ?? '');
                    } catch {}
                    // additionalFields.resume_url explicitly set overrides the auto value
                    if (additional.resume_url) resumeUrl = additional.resume_url as string;

                    if (inputType === 'upload') {
                        const binaryProp = this.getNodeParameter('binaryPropertyName', i) as string;
                        const binaryData = this.helpers.assertBinaryData(i, binaryProp);
                        const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);

                        const formData: Record<string, any> = {
                            file: {
                                value: buffer,
                                options: {
                                    filename: binaryData.fileName ?? 'upload',
                                    contentType: binaryData.mimeType ?? 'application/octet-stream',
                                },
                            },
                            title,
                            workflow_id: workflowId,
                            execution_id: executionId,
                            resume_url: resumeUrl,
                        };

                        const textFields = [
                            'description', 'tags', 'collection_name',
                            'automation_status', 'mime_type', 'duration', 'file_size',
                        ];
                        for (const field of textFields) {
                            if (additional[field] !== undefined && additional[field] !== '') {
                                formData[field] = String(additional[field]);
                            }
                        }

                        const boolFields = ['human_interaction', 'allow_regenerate'];
                        for (const field of boolFields) {
                            if (additional[field] !== undefined) {
                                formData[field] = additional[field] ? '1' : '0';
                            }
                        }

                        const numFields = ['width', 'height'];
                        for (const field of numFields) {
                            if (additional[field] !== undefined && additional[field] !== 0) {
                                formData[field] = String(additional[field]);
                            }
                        }

                        response = await this.helpers.request({
                            method: 'POST' as IHttpRequestMethods,
                            uri: `${baseUrl}/api/media/upload`,
                            headers: { 'X-API-Key': apiKey },
                            formData,
                            json: true,
                        });

                    } else {
                        const mediaType = this.getNodeParameter('mediaType', i) as string;
                        const sourceUrl = this.getNodeParameter('sourceUrl', i) as string;

                        const body: Record<string, any> = {
                            title,
                            media_type: mediaType,
                            url: sourceUrl,
                            workflow_id: workflowId,
                            execution_id: executionId,
                            resume_url: resumeUrl,
                        };

                        const skip = new Set(['resume_url']);
                        for (const [k, v] of Object.entries(additional)) {
                            if (!skip.has(k) && v !== '' && v !== 0 && v !== false) body[k] = v;
                        }

                        response = await this.helpers.request({
                            method: 'POST' as IHttpRequestMethods,
                            uri: `${baseUrl}/api/media`,
                            headers: jsonHeaders,
                            body,
                            json: true,
                        });
                    }

                } else if (operation === 'update') {
                    const mediaId = this.getNodeParameter('mediaId', i) as string;
                    const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/media/${mediaId}`,
                        headers: jsonHeaders,
                        body: additional,
                        json: true,
                    });

                } else if (operation === 'get') {
                    const mediaId = this.getNodeParameter('mediaId', i) as string;

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/media/${mediaId}`,
                        headers: jsonHeaders,
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
                        headers: jsonHeaders,
                        json: true,
                    });

                } else if (operation === 'delete') {
                    const mediaId = this.getNodeParameter('mediaId', i) as string;

                    response = await this.helpers.request({
                        method: 'DELETE' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/media/${mediaId}`,
                        headers: jsonHeaders,
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
