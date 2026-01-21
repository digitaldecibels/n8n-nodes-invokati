import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
} from 'n8n-workflow';

export class TokenUsage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invokati Token Usage',
		name: 'invokatiTokenUsage',
		icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invocati-dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Track AI model token usage and costs in Invokati',
		defaults: {
			name: 'Invokati Token Usage',
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
						name: 'Store Token Usage',
						value: 'store',
						description: 'Record AI model token usage and costs',
						action: 'Store token usage data',
					},
				],
				default: 'store',
			},
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g., abc123-def456',
				description: 'The n8n workflow ID (available as $workflow.id)',
				hint: 'Use expression: {{ $workflow.id }}',
			},
			{
				displayName: 'Execution ID',
				name: 'executionId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g., exec-xyz789',
				description: 'The n8n execution ID (available as $execution.id)',
				hint: 'Use expression: {{ $execution.id }}',
			},
			{
				displayName: 'Model ID',
				name: 'modelId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g., gpt-4, claude-3-opus',
				description: 'The AI model identifier (e.g., gpt-4, claude-3-opus, gemini-pro)',
			},
			{
				displayName: 'Input Tokens',
				name: 'inputTokens',
				type: 'number',
				required: true,
				default: 0,
				description: 'Number of tokens in the input/prompt',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Output Tokens',
				name: 'outputTokens',
				type: 'number',
				required: true,
				default: 0,
				description: 'Number of tokens in the output/completion',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Installation ID',
						name: 'installationId',
						type: 'number',
						default: 0,
						description: 'The Drupal node ID of the n8n installation',
					},
					{
						displayName: 'Node ID',
						name: 'nodeId',
						type: 'string',
						default: '',
						description: 'The specific n8n node that generated the token usage',
					},
					{
						displayName: 'Total Tokens',
						name: 'totalTokens',
						type: 'number',
						default: 0,
						description: 'Total tokens (will be calculated from input + output if not provided)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = await this.getCredentials('invokatiApi');
		const baseUrl = credentials.baseUrl as string;
		const apiKey = credentials.apiKey as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'store') {
					// Get required fields
					const workflowId = this.getNodeParameter('workflowId', i) as string;
					const executionId = this.getNodeParameter('executionId', i) as string;
					const modelId = this.getNodeParameter('modelId', i) as string;
					const inputTokens = this.getNodeParameter('inputTokens', i) as number;
					const outputTokens = this.getNodeParameter('outputTokens', i) as number;

					// Get optional fields
					const additionalFields = this.getNodeParameter('additionalFields', i) as {
						installationId?: number;
						nodeId?: string;
						totalTokens?: number;
					};

					// Calculate total tokens if not provided
					const totalTokens = additionalFields.totalTokens || (inputTokens + outputTokens);

					// Build request payload
					const payload: any = {
						workflow_id: workflowId,
						execution_id: executionId,
						model_id: modelId,
						input_tokens: inputTokens,
						output_tokens: outputTokens,
						total_tokens: totalTokens,
					};

					// Add optional fields if provided
					if (additionalFields.installationId) {
						payload.installation_id = additionalFields.installationId;
					}
					if (additionalFields.nodeId) {
						payload.node_id = additionalFields.nodeId;
					}

					// Make API request
					const options = {
						method: 'POST' as IHttpRequestMethods,
						headers: {
							'Content-Type': 'application/json',
							'X-API-Key': apiKey,
						},
						body: JSON.stringify(payload),
						uri: `${baseUrl}/api/token-usage`,
						json: true,
					};

					const response = await this.helpers.request(options);

					// Return the API response
					returnData.push({
						json: response,
						pairedItem: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							status: 'failed',
						},
						pairedItem: i,
					});
					continue;
				}
				throw new NodeOperationError(
					this.getNode(),
					`Failed to store token usage: ${error.message}`,
					{ itemIndex: i }
				);
			}
		}

		return [returnData];
	}
}
