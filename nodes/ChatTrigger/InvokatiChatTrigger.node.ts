import {
    IWebhookFunctions,
    IWebhookResponseData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

export class InvokatiChatTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Chat Trigger',
        name: 'invokatiChatTrigger',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['trigger'],
        version: 1,
        description: 'Chat trigger for Invokati dashboard chat widgets. Drop into any workflow to enable the chat interface on the dashboard.',
        defaults: {
            name: 'Invokati Chat Trigger',
        },
        inputs: [],
        outputs: ['main'],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'lastNode',
                path: 'invokati-chat',
            },
            {
                name: 'setup',
                httpMethod: 'GET',
                responseMode: 'onReceived',
                path: 'invokati-chat',
            },
        ],
        properties: [
            {
                displayName: 'Workflow Key',
                name: 'workflowKey',
                type: 'string',
                default: '',
                description: 'Paste the Workflow Key from your Invokati dashboard to link this trigger to the chat widget.',
                hint: 'Find this in the Invokati dashboard under the workflow node settings — labelled "Workflow Key".',
            },
        ],
    };

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const req = this.getRequestObject();

        if (req.method === 'GET') {
            return {
                webhookResponse: { data: [] },
                workflowData: [[{ json: {} }]],
            };
        }

        const bodyData = this.getBodyData() as {
            chatInput?: string;
            sessionId?: string;
            [key: string]: unknown;
        };

        const timestamp = new Date().toISOString();

        return {
            workflowData: [
                [
                    {
                        json: {
                            chatInput: bodyData.chatInput ?? '',
                            sessionId: bodyData.sessionId ?? '',
                            ...bodyData,
                            _invokati: {
                                received_at: timestamp,
                                source: 'chat_widget',
                            },
                        },
                    },
                ],
            ],
        };
    }
}
