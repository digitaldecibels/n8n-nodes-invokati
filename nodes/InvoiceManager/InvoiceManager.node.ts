import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class InvoiceManager implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Invoice Manager',
        name: 'invokatiInvoiceManager',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Create, update, retrieve, and manage invoices in your Invokati account',
        defaults: {
            name: 'Invokati Invoice Manager',
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
                        name: 'Create Invoice',
                        value: 'create',
                        description: 'Create a new invoice',
                        action: 'Create an invoice',
                    },
                    {
                        name: 'Update Invoice',
                        value: 'update',
                        description: 'Update an existing invoice by ID',
                        action: 'Update an invoice',
                    },
                    {
                        name: 'Get Invoice',
                        value: 'get',
                        description: 'Retrieve an invoice by ID',
                        action: 'Get an invoice',
                    },
                    {
                        name: 'List Invoices',
                        value: 'list',
                        description: 'List invoices with optional filters',
                        action: 'List invoices',
                    },
                    {
                        name: 'Update Status',
                        value: 'updateStatus',
                        description: 'Change an invoice status (e.g. sent, paid, overdue)',
                        action: 'Update invoice status',
                    },
                    {
                        name: 'Mark as Paid',
                        value: 'markPaid',
                        description: 'Mark an invoice as paid',
                        action: 'Mark invoice as paid',
                    },
                    {
                        name: 'Delete Invoice',
                        value: 'delete',
                        description: 'Permanently delete an invoice',
                        action: 'Delete an invoice',
                    },
                ],
                default: 'create',
            },

            // Invoice ID — update, get, updateStatus, markPaid, delete
            {
                displayName: 'Invoice ID',
                name: 'invoiceId',
                type: 'string',
                default: '',
                required: true,
                description: 'The Invokati invoice ID',
                displayOptions: {
                    show: {
                        operation: ['update', 'get', 'updateStatus', 'markPaid', 'delete'],
                    },
                },
            },

            // invoice_number — create (required)
            {
                displayName: 'Invoice Number',
                name: 'invoiceNumber',
                type: 'string',
                default: '',
                required: true,
                description: 'Unique invoice number (e.g. INV-2024-001)',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // amount — create (required)
            {
                displayName: 'Amount (cents)',
                name: 'amount',
                type: 'number',
                default: 0,
                required: true,
                description: 'Invoice total amount in cents (e.g. 5000 = $50.00)',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Status — updateStatus
            {
                displayName: 'Status',
                name: 'status',
                type: 'options',
                options: [
                    { name: 'Draft', value: 'draft' },
                    { name: 'Sent', value: 'sent' },
                    { name: 'Viewed', value: 'viewed' },
                    { name: 'Paid', value: 'paid' },
                    { name: 'Overdue', value: 'overdue' },
                    { name: 'Disputed', value: 'disputed' },
                    { name: 'Cancelled', value: 'cancelled' },
                ],
                default: 'sent',
                required: true,
                description: 'The new status for this invoice',
                displayOptions: {
                    show: {
                        operation: ['updateStatus'],
                    },
                },
            },

            // on_duplicate — create
            {
                displayName: 'On Duplicate',
                name: 'onDuplicate',
                type: 'options',
                options: [
                    { name: 'Ignore', value: 'ignore', description: 'Return the existing invoice without changes' },
                    { name: 'Update', value: 'update', description: 'Update the existing invoice with new values' },
                    { name: 'Create', value: 'create', description: 'Always create a new invoice' },
                ],
                default: 'ignore',
                description: 'What to do when an invoice with the same invoice_number already exists',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Additional fields — create
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
                options: [
                    {
                        displayName: 'Title',
                        name: 'title',
                        type: 'string',
                        default: '',
                        description: 'Human-readable invoice title',
                    },
                    {
                        displayName: 'Currency',
                        name: 'currency',
                        type: 'string',
                        default: 'USD',
                        description: 'ISO 4217 currency code (e.g. USD, EUR, GBP)',
                    },
                    {
                        displayName: 'Due Date',
                        name: 'due_date',
                        type: 'string',
                        default: '',
                        description: 'Due date as YYYY-MM-DD or Unix timestamp',
                    },
                    {
                        displayName: 'Client Name',
                        name: 'client_name',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Client Email',
                        name: 'client_email',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Client Company',
                        name: 'client_company',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Tax Amount (cents)',
                        name: 'tax_amount',
                        type: 'number',
                        default: 0,
                        description: 'Tax portion in cents (e.g. 500 = $5.00)',
                    },
                    {
                        displayName: 'Discount Amount (cents)',
                        name: 'discount_amount',
                        type: 'number',
                        default: 0,
                        description: 'Discount applied in cents',
                    },
                    {
                        displayName: 'Payment URL',
                        name: 'payment_url',
                        type: 'string',
                        default: '',
                        description: 'Link to Stripe checkout, PayPal, or other payment page',
                    },
                    {
                        displayName: 'Payment Method',
                        name: 'payment_method',
                        type: 'string',
                        default: '',
                        description: 'e.g. Stripe, ACH, Wire',
                    },
                    {
                        displayName: 'Issued At',
                        name: 'issued_at',
                        type: 'string',
                        default: '',
                        description: 'When the invoice was issued/sent (YYYY-MM-DD or Unix timestamp)',
                    },
                    {
                        displayName: 'PDF URL',
                        name: 'pdf_url',
                        type: 'string',
                        default: '',
                        description: 'URL of the invoice PDF. Storage provider (Google Drive, Dropbox, S3, etc.) is auto-detected.',
                    },
                    {
                        displayName: 'Line Items (JSON)',
                        name: 'line_items',
                        type: 'string',
                        default: '',
                        description: 'JSON array of line items: [{description, quantity, unit_price, total}] — amounts in cents',
                    },
                    {
                        displayName: 'Notes',
                        name: 'notes',
                        type: 'string',
                        typeOptions: { rows: 3 },
                        default: '',
                        description: 'Internal notes or payment instructions',
                    },
                    {
                        displayName: 'Custom Data (JSON)',
                        name: 'custom_data',
                        type: 'string',
                        default: '',
                        description: 'Arbitrary JSON object to store with this invoice',
                    },
                    {
                        displayName: 'Workflow ID',
                        name: 'workflow_id',
                        type: 'string',
                        default: '={{$workflow.id}}',
                        description: 'n8n workflow UUID (auto-fills from current workflow)',
                    },
                    {
                        displayName: 'Execution ID',
                        name: 'execution_id',
                        type: 'string',
                        default: '={{$execution.id}}',
                    },
                    {
                        displayName: 'Human Interaction Required',
                        name: 'human_interaction',
                        type: 'boolean',
                        default: false,
                        description: 'Flag this invoice for human review in the dashboard',
                    },
                    {
                        displayName: 'Resume URL',
                        name: 'resume_url',
                        type: 'string',
                        default: '',
                        description: 'n8n Wait node webhook URL — Invokati will POST to this URL after approval/denial',
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
                ],
            },

            // Update fields — update
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
                    { displayName: 'Title', name: 'title', type: 'string', default: '' },
                    { displayName: 'Amount (cents)', name: 'amount', type: 'number', default: 0, description: 'Amount in cents (e.g. 5000 = $50.00)' },
                    { displayName: 'Currency', name: 'currency', type: 'string', default: '' },
                    { displayName: 'Tax Amount (cents)', name: 'tax_amount', type: 'number', default: 0 },
                    { displayName: 'Discount Amount (cents)', name: 'discount_amount', type: 'number', default: 0 },
                    { displayName: 'Due Date', name: 'due_date', type: 'string', default: '' },
                    { displayName: 'Issued At', name: 'issued_at', type: 'string', default: '' },
                    { displayName: 'Client Name', name: 'client_name', type: 'string', default: '' },
                    { displayName: 'Client Email', name: 'client_email', type: 'string', default: '' },
                    { displayName: 'Client Company', name: 'client_company', type: 'string', default: '' },
                    { displayName: 'Payment URL', name: 'payment_url', type: 'string', default: '' },
                    { displayName: 'Payment Method', name: 'payment_method', type: 'string', default: '' },
                    { displayName: 'PDF URL', name: 'pdf_url', type: 'string', default: '' },
                    { displayName: 'Notes', name: 'notes', type: 'string', default: '' },
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
                ],
            },

            // Filters — list
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
                        displayName: 'Status',
                        name: 'status',
                        type: 'options',
                        options: [
                            { name: 'All', value: '' },
                            { name: 'Draft', value: 'draft' },
                            { name: 'Sent', value: 'sent' },
                            { name: 'Paid', value: 'paid' },
                            { name: 'Overdue', value: 'overdue' },
                            { name: 'Disputed', value: 'disputed' },
                            { name: 'Cancelled', value: 'cancelled' },
                        ],
                        default: '',
                    },
                    {
                        displayName: 'Limit',
                        name: 'limit',
                        type: 'number',
                        default: 20,
                        description: 'Maximum number of invoices to return',
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
            const operation = this.getNodeParameter('operation', i) as string;
            let response: any;

            try {
                if (operation === 'create') {
                    const invoiceNumber = this.getNodeParameter('invoiceNumber', i) as string;
                    const amount = this.getNodeParameter('amount', i) as number;
                    const onDuplicate = this.getNodeParameter('onDuplicate', i) as string;
                    const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                    const body: Record<string, any> = {
                        invoice_number: invoiceNumber,
                        amount,
                        on_duplicate: onDuplicate,
                        workflow_id: additional.workflow_id ?? `={{$workflow.id}}`,
                        execution_id: additional.execution_id ?? '',
                    };

                    for (const [k, v] of Object.entries(additional)) {
                        if (['workflow_id', 'execution_id'].includes(k)) continue;
                        // JSON string fields — parse before sending
                        if ((k === 'line_items' || k === 'custom_data') && typeof v === 'string' && v !== '') {
                            try { body[k] = JSON.parse(v); } catch { body[k] = v; }
                            continue;
                        }
                        if (v !== '' && v !== 0 && v !== false) {
                            body[k] = v;
                        }
                    }

                    response = await this.helpers.request({
                        method: 'POST' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/invoices`,
                        headers,
                        body,
                        json: true,
                    });

                } else if (operation === 'update') {
                    const invoiceId = this.getNodeParameter('invoiceId', i) as string;
                    const fields = this.getNodeParameter('updateFields', i) as Record<string, any>;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/invoices/${invoiceId}`,
                        headers,
                        body: fields,
                        json: true,
                    });

                } else if (operation === 'get') {
                    const invoiceId = this.getNodeParameter('invoiceId', i) as string;

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/invoices/${invoiceId}`,
                        headers,
                        json: true,
                    });

                } else if (operation === 'list') {
                    const filters = this.getNodeParameter('filters', i) as Record<string, any>;
                    const params = new URLSearchParams();
                    if (filters.status) params.set('status', filters.status);
                    if (filters.limit) params.set('limit', String(filters.limit));

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/invoices/list?${params.toString()}`,
                        headers,
                        json: true,
                    });

                } else if (operation === 'updateStatus') {
                    const invoiceId = this.getNodeParameter('invoiceId', i) as string;
                    const status = this.getNodeParameter('status', i) as string;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/invoices/${invoiceId}/status`,
                        headers,
                        body: { status },
                        json: true,
                    });

                } else if (operation === 'markPaid') {
                    const invoiceId = this.getNodeParameter('invoiceId', i) as string;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/invoices/${invoiceId}/status`,
                        headers,
                        body: { status: 'paid' },
                        json: true,
                    });

                } else if (operation === 'delete') {
                    const invoiceId = this.getNodeParameter('invoiceId', i) as string;

                    response = await this.helpers.request({
                        method: 'DELETE' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/invoices/${invoiceId}`,
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
