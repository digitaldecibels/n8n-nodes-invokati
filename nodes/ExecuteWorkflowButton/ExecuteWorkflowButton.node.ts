import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class ExecuteWorkflowButton implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invokati Execute Workflow Button',
		name: 'executeWorkflowButton',
		icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invocati-dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow via an Invokati webhook call',
		defaults: {
			name: 'Invokati Execute Workflow Button',
		},
		inputs: [],
		outputs: ['main'],
		// This section defines the Webhook settings (replaces your Webhook node)
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook', // Users can customize this in the UI
			},
		],
		properties: [
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'hidden',
				default: 'POST',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Custom Response Message',
						name: 'customMessage',
						type: 'string',
						default: 'Success',
						description: 'A message to include in the response payload',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const executionId = this.getExecutionId();
		const options = this.getNodeParameter('options', {}) as { customMessage?: string };

		// This replaces your "Respond to Webhook" node logic
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
			webhookResponse: {
				status: 200,
				body: {
					status: options.customMessage || 'received',
					execution_id: executionId,
					timestamp: new Date().toISOString(),
				},
				headers: {
					'content-type': 'application/json',
				},
			},
		};
	}
}