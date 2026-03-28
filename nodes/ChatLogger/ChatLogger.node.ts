import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class ChatLogger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Chat Logger',
        name: 'invokatiChatLogger',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Log AI chat messages and manage chat sessions in Invokati',
        defaults: {
            name: 'Invokati Chat Logger',
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
            // ----------------------------------------------------------------
            // Operation
            // ----------------------------------------------------------------
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Log Message',
                        value: 'log_message',
                        description: 'Append a message to a chat session (creates the session if it does not exist)',
                        action: 'Log a chat message',
                    },
                    {
                        name: 'Complete Session',
                        value: 'complete_session',
                        description: 'Mark a chat session as completed',
                        action: 'Complete a chat session',
                    },
                    {
                        name: 'Get Session',
                        value: 'get_session',
                        description: 'Retrieve a chat session and all its messages by Drupal ID',
                        action: 'Get a chat session',
                    },
                    {
                        name: 'List Sessions',
                        value: 'list_sessions',
                        description: 'List chat sessions with optional filters',
                        action: 'List chat sessions',
                    },
                    {
                        name: 'Update Session',
                        value: 'update_session',
                        description: 'Update a session\'s title, status, or linked lead',
                        action: 'Update a chat session',
                    },
                    {
                        name: 'Delete Session',
                        value: 'delete_session',
                        description: 'Delete a chat session and all its messages',
                        action: 'Delete a chat session',
                    },
                    {
                        name: 'Delete Message',
                        value: 'delete_message',
                        description: 'Delete a single message from a chat session',
                        action: 'Delete a chat message',
                    },
                    {
                        name: 'Get Stats',
                        value: 'get_stats',
                        description: 'Retrieve aggregated chat statistics for your team',
                        action: 'Get chat stats',
                    },
                ],
                default: 'log_message',
            },

            // ----------------------------------------------------------------
            // Log Message: Enable Chat Logging toggle
            // ----------------------------------------------------------------
            {
                displayName: 'Enable Chat Logging',
                name: 'enableChatLogging',
                type: 'boolean',
                default: true,
                description: 'Whether to log this message to the Invokati chat session store',
                displayOptions: {
                    show: { operation: ['log_message'] },
                },
            },

            // ----------------------------------------------------------------
            // Shared: Session ID string — log_message and complete_session
            // ----------------------------------------------------------------
            {
                displayName: 'Session ID',
                name: 'sessionId',
                type: 'string',
                required: true,
                default: '',
                placeholder: 'e.g., {{ $execution.id }} or a unique conversation key',
                description: 'Unique external identifier for this conversation. All messages with the same Session ID are grouped into one thread.',
                displayOptions: {
                    show: { operation: ['log_message', 'complete_session'] },
                },
            },

            // ----------------------------------------------------------------
            // Shared: Chat ID (Drupal integer) — get, update, delete, delete_message
            // ----------------------------------------------------------------
            {
                displayName: 'Chat Session ID',
                name: 'chatId',
                type: 'number',
                required: true,
                default: 0,
                description: 'The Drupal entity ID of the chat session (returned as "id" in log_message responses)',
                displayOptions: {
                    show: { operation: ['get_session', 'update_session', 'delete_session', 'delete_message'] },
                },
            },

            // ----------------------------------------------------------------
            // Delete Message: Message ID
            // ----------------------------------------------------------------
            {
                displayName: 'Message ID',
                name: 'messageId',
                type: 'number',
                required: true,
                default: 0,
                description: 'The Drupal entity ID of the message to delete (returned as "id" in log_message responses)',
                displayOptions: {
                    show: { operation: ['delete_message'] },
                },
            },

            // ----------------------------------------------------------------
            // Log Message: Role
            // ----------------------------------------------------------------
            {
                displayName: 'Role',
                name: 'role',
                type: 'options',
                required: true,
                displayOptions: {
                    show: { operation: ['log_message'] },
                },
                options: [
                    { name: 'User', value: 'user', description: 'Message from the end user' },
                    { name: 'Assistant', value: 'assistant', description: 'Response from the AI model' },
                    { name: 'System', value: 'system', description: 'System-level instruction' },
                    { name: 'Tool', value: 'tool', description: 'Tool call or tool result' },
                ],
                default: 'user',
                description: 'Who sent this message',
            },

            // ----------------------------------------------------------------
            // Log Message: Content
            // ----------------------------------------------------------------
            {
                displayName: 'Content',
                name: 'content',
                type: 'string',
                required: true,
                displayOptions: {
                    show: { operation: ['log_message'] },
                },
                typeOptions: { rows: 4 },
                default: '',
                placeholder: 'Message text or tool output…',
                description: 'The message content',
            },

            // ----------------------------------------------------------------
            // Log Message: Additional fields
            // ----------------------------------------------------------------
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: { operation: ['log_message'] },
                },
                options: [
                    {
                        displayName: 'System Prompt',
                        name: 'systemPrompt',
                        type: 'string',
                        typeOptions: { rows: 3 },
                        default: '',
                        description: 'The LLM system prompt. Stored on the session; only applied on the first message.',
                    },
                    {
                        displayName: 'RAG Context (JSON)',
                        name: 'context',
                        type: 'string',
                        typeOptions: { rows: 3 },
                        default: '',
                        description: 'Retrieved context chunks or documents used for this response. Pass as a JSON string or use an expression.',
                    },
                    {
                        displayName: 'Message-Level Context (JSON)',
                        name: 'messageContext',
                        type: 'string',
                        typeOptions: { rows: 3 },
                        default: '',
                        description: 'Per-message RAG context (if different from the session-level context).',
                    },
                    {
                        displayName: 'Lead ID',
                        name: 'leadId',
                        type: 'number',
                        default: 0,
                        description: 'Drupal Lead entity ID to link to this session',
                        typeOptions: { minValue: 0 },
                    },
                    {
                        displayName: 'Lead Email',
                        name: 'leadEmail',
                        type: 'string',
                        default: '',
                        placeholder: 'user@example.com',
                        description: 'Email address to match or auto-create a lead (chatbot source). Used only if Lead ID is not set.',
                    },
                    {
                        displayName: 'Lead First Name',
                        name: 'leadFirstName',
                        type: 'string',
                        default: '',
                        description: 'First name for auto-created lead (defaults to "Chatbot")',
                    },
                    {
                        displayName: 'Lead Last Name',
                        name: 'leadLastName',
                        type: 'string',
                        default: '',
                        description: 'Last name for auto-created lead (defaults to "Lead")',
                    },
                    {
                        displayName: 'Session Status',
                        name: 'status',
                        type: 'options',
                        options: [
                            { name: 'Active', value: 'active' },
                            { name: 'Completed', value: 'completed' },
                            { name: 'Abandoned', value: 'abandoned' },
                        ],
                        default: 'active',
                        description: 'Session status. Set to "completed" on the last message to close the session.',
                    },
                    {
                        displayName: 'Installation ID',
                        name: 'installationId',
                        type: 'number',
                        default: 0,
                        description: 'Drupal node ID of the n8n installation (auto-resolved from workflow if not set)',
                    },
                ],
            },

            // ----------------------------------------------------------------
            // Log Message: Token Tracking
            // ----------------------------------------------------------------
            {
                displayName: 'Enable Token Logging',
                name: 'enableTokenLogging',
                type: 'boolean',
                default: false,
                description: 'Whether to also record this message\'s token usage to the Invokati token tracker',
                displayOptions: {
                    show: { operation: ['log_message'] },
                },
            },
            {
                displayName: 'Model ID',
                name: 'tokenModelId',
                type: 'string',
                default: '',
                placeholder: 'e.g., gpt-4o, claude-3-5-sonnet-20241022',
                description: 'The AI model used for this message turn',
                displayOptions: {
                    show: { operation: ['log_message'], enableTokenLogging: [true] },
                },
            },
            {
                displayName: 'Input Tokens',
                name: 'tokenInputTokens',
                type: 'number',
                default: 0,
                typeOptions: { minValue: 0 },
                description: 'Tokens used in the input/prompt for this message turn',
                displayOptions: {
                    show: { operation: ['log_message'], enableTokenLogging: [true] },
                },
            },
            {
                displayName: 'Output Tokens',
                name: 'tokenOutputTokens',
                type: 'number',
                default: 0,
                typeOptions: { minValue: 0 },
                description: 'Tokens generated in the output/completion for this message turn',
                displayOptions: {
                    show: { operation: ['log_message'], enableTokenLogging: [true] },
                },
            },
            {
                displayName: 'Workflow ID',
                name: 'tokenWorkflowId',
                type: 'string',
                default: '={{ $workflow.id }}',
                description: 'n8n workflow ID for the token usage record',
                displayOptions: {
                    show: { operation: ['log_message'], enableTokenLogging: [true] },
                },
            },
            {
                displayName: 'Execution ID',
                name: 'tokenExecutionId',
                type: 'string',
                default: '={{ $execution.id }}',
                description: 'n8n execution ID for the token usage record',
                displayOptions: {
                    show: { operation: ['log_message'], enableTokenLogging: [true] },
                },
            },
            {
                displayName: 'Node Name',
                name: 'tokenNodeId',
                type: 'string',
                default: '',
                placeholder: 'e.g., AI Agent, OpenAI',
                description: 'The n8n node name that generated the tokens (optional, for attribution in reports)',
                displayOptions: {
                    show: { operation: ['log_message'], enableTokenLogging: [true] },
                },
            },

            // ----------------------------------------------------------------
            // Complete Session: Title (optional)
            // ----------------------------------------------------------------
            {
                displayName: 'Title',
                name: 'title',
                type: 'string',
                displayOptions: {
                    show: { operation: ['complete_session'] },
                },
                default: '',
                placeholder: 'Optional: override the auto-generated title',
                description: 'Set a custom title for the session. Leave blank to keep the auto-generated title.',
            },

            // ----------------------------------------------------------------
            // List Sessions: Filters
            // ----------------------------------------------------------------
            {
                displayName: 'Filters',
                name: 'filters',
                type: 'collection',
                placeholder: 'Add Filter',
                default: {},
                displayOptions: {
                    show: { operation: ['list_sessions'] },
                },
                options: [
                    {
                        displayName: 'Group ID',
                        name: 'group_id',
                        type: 'number',
                        default: 0,
                        description: 'Filter to a specific client group ID',
                    },
                    {
                        displayName: 'Search',
                        name: 'q',
                        type: 'string',
                        default: '',
                        description: 'Keyword search on session_id or title',
                    },
                    {
                        displayName: 'Status',
                        name: 'status',
                        type: 'options',
                        options: [
                            { name: 'Any', value: '' },
                            { name: 'Active', value: 'active' },
                            { name: 'Completed', value: 'completed' },
                            { name: 'Abandoned', value: 'abandoned' },
                        ],
                        default: '',
                        description: 'Filter by session status',
                    },
                    {
                        displayName: 'Page',
                        name: 'page',
                        type: 'number',
                        default: 0,
                        description: '0-indexed page number',
                        typeOptions: { minValue: 0 },
                    },
                    {
                        displayName: 'Limit',
                        name: 'limit',
                        type: 'number',
                        default: 25,
                        description: 'Results per page (max 100)',
                        typeOptions: { minValue: 1, maxValue: 100 },
                    },
                ],
            },

            // ----------------------------------------------------------------
            // Update Session: Fields
            // ----------------------------------------------------------------
            {
                displayName: 'Update Fields',
                name: 'updateFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: { operation: ['update_session'] },
                },
                options: [
                    {
                        displayName: 'Title',
                        name: 'title',
                        type: 'string',
                        default: '',
                        description: 'New title for the session',
                    },
                    {
                        displayName: 'Status',
                        name: 'status',
                        type: 'options',
                        options: [
                            { name: 'Active', value: 'active' },
                            { name: 'Completed', value: 'completed' },
                            { name: 'Abandoned', value: 'abandoned' },
                        ],
                        default: 'active',
                    },
                    {
                        displayName: 'Lead ID',
                        name: 'lead_id',
                        type: 'number',
                        default: 0,
                        description: 'Link this session to a Lead entity',
                        typeOptions: { minValue: 0 },
                    },
                ],
            },

            // ----------------------------------------------------------------
            // Get Stats: Optional Group ID
            // ----------------------------------------------------------------
            {
                displayName: 'Group ID',
                name: 'groupId',
                type: 'number',
                default: 0,
                description: 'Filter stats to a specific client group ID. Leave 0 for all groups.',
                displayOptions: {
                    show: { operation: ['get_stats'] },
                },
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
        const workflowId = this.getWorkflow().id as string;
        const executionId = this.getExecutionId();

        for (let i = 0; i < items.length; i++) {
            try {
                let response: any;

                if (operation === 'log_message') {
                    const enableChatLogging = this.getNodeParameter('enableChatLogging', i) as boolean;
                    const enableTokenLogging = this.getNodeParameter('enableTokenLogging', i) as boolean;

                    const result: Record<string, unknown> = {};

                    if (enableChatLogging) {
                        const sessionId = this.getNodeParameter('sessionId', i) as string;
                        const role = this.getNodeParameter('role', i) as string;
                        const content = this.getNodeParameter('content', i) as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i) as {
                            systemPrompt?: string;
                            context?: string;
                            messageContext?: string;
                            leadId?: number;
                            leadEmail?: string;
                            leadFirstName?: string;
                            leadLastName?: string;
                            status?: string;
                            installationId?: number;
                        };

                        const payload: Record<string, unknown> = {
                            session_id: sessionId,
                            role,
                            content,
                            workflow_id: workflowId,
                            execution_id: executionId,
                        };

                        if (additionalFields.systemPrompt) payload.system_prompt = additionalFields.systemPrompt;
                        if (additionalFields.context) payload.context = additionalFields.context;
                        if (additionalFields.messageContext) payload.message_context = additionalFields.messageContext;
                        if (additionalFields.leadId) payload.lead_id = additionalFields.leadId;
                        if (additionalFields.leadEmail) payload.lead_email = additionalFields.leadEmail;
                        if (additionalFields.leadFirstName) payload.lead_first_name = additionalFields.leadFirstName;
                        if (additionalFields.leadLastName) payload.lead_last_name = additionalFields.leadLastName;
                        if (additionalFields.status) payload.status = additionalFields.status;
                        if (additionalFields.installationId) payload.installation_id = additionalFields.installationId;

                        result.chat = await this.helpers.request({
                            method: 'POST' as IHttpRequestMethods,
                            headers,
                            body: payload,
                            uri: `${baseUrl}/api/chats/message`,
                            json: true,
                        });
                    }

                    if (enableTokenLogging) {
                        const tokenModelId = this.getNodeParameter('tokenModelId', i) as string;
                        const tokenInputTokens = this.getNodeParameter('tokenInputTokens', i) as number;
                        const tokenOutputTokens = this.getNodeParameter('tokenOutputTokens', i) as number;
                        const tokenWorkflowId = this.getNodeParameter('tokenWorkflowId', i) as string;
                        const tokenExecutionId = this.getNodeParameter('tokenExecutionId', i) as string;
                        const tokenNodeId = this.getNodeParameter('tokenNodeId', i, '') as string;

                        const tokenPayload: Record<string, unknown> = {
                            workflow_id: tokenWorkflowId || workflowId,
                            execution_id: tokenExecutionId || executionId,
                            model_id: tokenModelId,
                            input_tokens: tokenInputTokens,
                            output_tokens: tokenOutputTokens,
                            total_tokens: tokenInputTokens + tokenOutputTokens,
                        };

                        if (tokenNodeId) tokenPayload.node_id = tokenNodeId;

                        result.token_usage = await this.helpers.request({
                            method: 'POST' as IHttpRequestMethods,
                            headers,
                            body: tokenPayload,
                            uri: `${baseUrl}/api/token-usage`,
                            json: true,
                        });
                    }

                    response = result;

                } else if (operation === 'complete_session') {
                    const sessionId = this.getNodeParameter('sessionId', i) as string;
                    const title = this.getNodeParameter('title', i, '') as string;

                    const payload: Record<string, unknown> = {
                        session_id: sessionId,
                        role: 'system',
                        content: '__session_complete__',
                        status: 'completed',
                        workflow_id: workflowId,
                        execution_id: executionId,
                    };
                    if (title) payload.title = title;

                    response = await this.helpers.request({
                        method: 'POST' as IHttpRequestMethods,
                        headers,
                        body: payload,
                        uri: `${baseUrl}/api/chats/message`,
                        json: true,
                    });

                    if (title && response?.session?.id) {
                        await this.helpers.request({
                            method: 'PATCH' as IHttpRequestMethods,
                            headers,
                            body: { title, status: 'completed' },
                            uri: `${baseUrl}/api/chats/${response.session.id}`,
                            json: true,
                        });
                    }

                } else if (operation === 'get_session') {
                    const chatId = this.getNodeParameter('chatId', i) as number;

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        headers,
                        uri: `${baseUrl}/api/chats/${chatId}`,
                        json: true,
                    });

                } else if (operation === 'list_sessions') {
                    const filters = this.getNodeParameter('filters', i) as {
                        group_id?: number;
                        q?: string;
                        status?: string;
                        page?: number;
                        limit?: number;
                    };

                    const params = new URLSearchParams();
                    if (filters.group_id) params.set('group_id', String(filters.group_id));
                    if (filters.q) params.set('q', filters.q);
                    if (filters.status) params.set('status', filters.status);
                    if (filters.page !== undefined) params.set('page', String(filters.page));
                    if (filters.limit !== undefined) params.set('limit', String(filters.limit));

                    const qs = params.toString();
                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        headers,
                        uri: `${baseUrl}/api/chats/list${qs ? '?' + qs : ''}`,
                        json: true,
                    });

                } else if (operation === 'update_session') {
                    const chatId = this.getNodeParameter('chatId', i) as number;
                    const updateFields = this.getNodeParameter('updateFields', i) as {
                        title?: string;
                        status?: string;
                        lead_id?: number;
                    };

                    const body: Record<string, unknown> = {};
                    if (updateFields.title !== undefined) body.title = updateFields.title;
                    if (updateFields.status) body.status = updateFields.status;
                    if (updateFields.lead_id) body.lead_id = updateFields.lead_id;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        headers,
                        body,
                        uri: `${baseUrl}/api/chats/${chatId}`,
                        json: true,
                    });

                } else if (operation === 'delete_session') {
                    const chatId = this.getNodeParameter('chatId', i) as number;

                    response = await this.helpers.request({
                        method: 'DELETE' as IHttpRequestMethods,
                        headers,
                        uri: `${baseUrl}/api/chats/${chatId}`,
                        json: true,
                    });

                } else if (operation === 'delete_message') {
                    const chatId = this.getNodeParameter('chatId', i) as number;
                    const messageId = this.getNodeParameter('messageId', i) as number;

                    response = await this.helpers.request({
                        method: 'DELETE' as IHttpRequestMethods,
                        headers,
                        uri: `${baseUrl}/api/chats/${chatId}/messages/${messageId}`,
                        json: true,
                    });

                } else if (operation === 'get_stats') {
                    const groupId = this.getNodeParameter('groupId', i) as number;

                    const qs = groupId ? `?group_id=${groupId}` : '';
                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        headers,
                        uri: `${baseUrl}/api/chats/stats${qs}`,
                        json: true,
                    });
                }

                returnData.push({ json: response ?? {}, pairedItem: i });

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: (error as Error).message, operation, status: 'failed' },
                        pairedItem: i,
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
            }
        }

        return [returnData];
    }
}
