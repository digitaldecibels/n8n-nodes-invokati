import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class DashboardNotifier implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Dashboard Notifier',
        name: 'invokatiDashboardNotifier',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['output'],
        version: 1,
        description: 'Send a notification to the Invokati dashboard notification bell from within a workflow.',
        defaults: {
            name: 'Invokati Dashboard Notifier',
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
                displayName: 'Title',
                name: 'title',
                type: 'string',
                required: true,
                default: '',
                placeholder: 'e.g., Report generated successfully',
                description: 'Short notification title shown in the bell dropdown (max 255 characters)',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'string',
                required: true,
                typeOptions: { rows: 3 },
                default: '',
                placeholder: 'e.g., The weekly sales report has been generated and is ready for review.',
                description: 'Full notification message body',
            },
            {
                displayName: 'Type',
                name: 'type',
                type: 'options',
                options: [
                    { name: 'Workflow Alert', value: 'workflow_alert', description: 'General alert from a workflow' },
                    { name: 'Workflow Complete', value: 'workflow_complete', description: 'A workflow finished successfully' },
                    { name: 'Workflow Error', value: 'workflow_error', description: 'A workflow encountered an error' },
                    { name: 'Human Review', value: 'human_review', description: 'Something needs manual review' },
                    { name: 'New Lead', value: 'new_lead', description: 'A new CRM lead was created' },
                    { name: 'New Media', value: 'new_media', description: 'A new media item was added' },
                ],
                default: 'workflow_alert',
                description: 'Notification type — used for icon and filtering in the dashboard',
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                options: [
                    {
                        displayName: 'Link URL',
                        name: 'link',
                        type: 'string',
                        default: '',
                        placeholder: 'https://invokati.com/payloads/123',
                        description: 'Optional URL the notification links to when clicked',
                    },
                    {
                        displayName: 'Entity Type',
                        name: 'entity_type',
                        type: 'string',
                        default: '',
                        placeholder: 'e.g., custom_payload, lead, media_item',
                        description: 'The entity type this notification relates to',
                    },
                    {
                        displayName: 'Entity ID',
                        name: 'entity_id',
                        type: 'number',
                        default: 0,
                        description: 'The entity ID this notification relates to',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('invokatiApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
        const apiKey = credentials.apiKey as string;

        const headers = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' };

        for (let i = 0; i < items.length; i++) {
            try {
                const title = this.getNodeParameter('title', i) as string;
                const message = this.getNodeParameter('message', i) as string;
                const type = this.getNodeParameter('type', i) as string;
                const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                const body: Record<string, any> = { title, message, type };

                if (additional.link) body.link = additional.link;
                if (additional.entity_type) body.entity_type = additional.entity_type;
                if (additional.entity_id) body.entity_id = additional.entity_id;

                const response = await this.helpers.request({
                    method: 'POST' as IHttpRequestMethods,
                    uri: `${baseUrl}/api/notifications`,
                    headers,
                    body,
                    json: true,
                });

                returnData.push({ json: response ?? {}, pairedItem: i });

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message, status: 'failed' }, pairedItem: i });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
            }
        }

        return [returnData];
    }
}
