import {
    IWebhookFunctions,
    IWebhookResponseData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

export class ExecuteWorkflowButton implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Workflow Button',
        name: 'invokatiWorkflowButton',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['trigger'],
        version: 1,
        description: 'Trigger for Invokati dashboard workflow buttons. Responds immediately so the dashboard button shows feedback without waiting for the full workflow to complete.',
        defaults: {
            name: 'Invokati Workflow Button',
        },
        inputs: [],
        outputs: ['main'],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: 'invokati-trigger',
            },
        ],
        properties: [
            {
                displayName: 'Workflow Key',
                name: 'workflowKey',
                type: 'string',
                default: '',
                description: 'The Workflow Key from your Invokati workflow node (field_workflow_key). Paste this into the Invokati dashboard to link the trigger button to this node.',
                hint: 'Find this under the workflow node settings in Invokati — labelled "Workflow Key".',
            },
        ],
    };

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const bodyData = this.getBodyData();
        const timestamp = new Date().toISOString();

        return {
            webhookResponse: {
                status: 'accepted',
                timestamp,
                message: 'Workflow triggered successfully',
            },
            workflowData: [
                [
                    {
                        json: {
                            ...bodyData,
                            _invokati: {
                                triggered_at: timestamp,
                                source: 'dashboard_button',
                            },
                        },
                    },
                ],
            ],
        };
    }
}
