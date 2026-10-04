import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { DEFAULT_BASE_URL, fetchCatalogue, toEndpointOptions, toResourceFields } from './catalogue';

// Keep in step with package.json "version" (verified community nodes may not import it).
const CLIENT_HEADER = 'n8n/0.1.2';

const PLATFORMS: INodePropertyOptions[] = [
	{ name: 'Facebook', value: 'facebook' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'LinkedIn', value: 'linkedin' },
	{ name: 'Pinterest', value: 'pinterest' },
	{ name: 'Reddit', value: 'reddit' },
	{ name: 'Threads', value: 'threads' },
	{ name: 'TikTok', value: 'tiktok' },
	{ name: 'Twitter/X', value: 'twitter' },
	{ name: 'YouTube', value: 'youtube' },
];

interface ApiResponse extends IDataObject {
	success?: boolean;
	data?: IDataObject;
	pagination?: { next_cursor?: string | null; has_more?: boolean };
	credits_used?: number;
	credits_remaining?: number | null;
	error?: { type?: string; message?: string };
}

export class InsightSocial implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'InsightSocial',
		name: 'insightSocial',
		icon: { light: 'file:insightsocial.svg', dark: 'file:insightsocial.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] === "call" ? $parameter["endpoint"] : $parameter["operation"] }}',
		description:
			'Public data from Instagram, TikTok, Facebook, LinkedIn, X, Threads, YouTube, Reddit and Pinterest',
		defaults: { name: 'InsightSocial' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'insightSocialApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Call Endpoint',
						value: 'call',
						action: 'Call an endpoint',
						description: 'Fetch public data from one endpoint, priced per call in credits',
					},
					{
						name: 'Get Credits',
						value: 'credits',
						action: 'Get your credit balance',
						description: 'Return your balance and this month’s usage. Free.',
					},
					{
						name: 'List Endpoints',
						value: 'list',
						action: 'List endpoints and prices',
						description: 'Return every endpoint on a platform with its parameters and price. Free.',
					},
				],
				default: 'call',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: PLATFORMS,
				default: 'instagram',
				displayOptions: { show: { operation: ['call', 'list'] } },
			},
			{
				displayName: 'Endpoint Name or ID',
				name: 'endpoint',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEndpoints',
					loadOptionsDependsOn: ['platform'],
				},
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Each option shows its price per call. An ID is a path such as /v1/tiktok/profile.',
				displayOptions: { show: { operation: ['call'] } },
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['endpoint'],
					resourceMapper: {
						resourceMapperMethod: 'getEndpointParameters',
						mode: 'add',
						fieldWords: { singular: 'parameter', plural: 'parameters' },
						addAllFields: false,
						multiKeyMatch: false,
						supportAutoMap: false,
					},
				},
				displayOptions: { show: { operation: ['call'] } },
			},
			{
				displayName: 'Return All Pages',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				hint: 'Follows the next page until there is none or Max Pages is reached. Every page is charged.',
				displayOptions: { show: { operation: ['call'] } },
			},
			{
				displayName: 'Max Pages',
				name: 'maxPages',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 5,
				description: 'Upper limit on pages fetched, so a long list cannot spend more than you expect',
				displayOptions: { show: { operation: ['call'], returnAll: [true] } },
			},
			{
				displayName: 'Output',
				name: 'output',
				type: 'options',
				options: [
					{
						name: 'One Item per Row',
						value: 'rows',
						description: 'Split list results into one item per row. Single objects stay one item.',
					},
					{
						name: 'Full Response',
						value: 'response',
						description:
							'One item per page with the whole response, including credits_used and credits_remaining',
					},
				],
				default: 'rows',
				displayOptions: { show: { operation: ['call'] } },
			},
		],
	};

	methods = {
		loadOptions: {
			async getEndpoints(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const platform = this.getCurrentNodeParameter('platform') as string;
				return toEndpointOptions(await fetchCatalogue(this, platform));
			},
		},
		resourceMapping: {
			async getEndpointParameters(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const path = this.getCurrentNodeParameter('endpoint') as string;
				const platform = this.getCurrentNodeParameter('platform') as string;
				if (!path) return { fields: [] };
				const endpoint = (await fetchCatalogue(this, platform)).find((e) => e.path === path);
				return { fields: endpoint ? toResourceFields(endpoint) : [] };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('insightSocialApi');
		const baseUrl = String(credentials.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');

		const request = async (path: string, qs: IDataObject, itemIndex: number): Promise<ApiResponse> => {
			const options: IHttpRequestOptions = {
				method: 'GET',
				url: `${baseUrl}${path}`,
				qs,
				headers: { 'x-insightsocial-client': CLIENT_HEADER },
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			};
			const response = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'insightSocialApi',
				options,
			)) as { statusCode: number; body: ApiResponse };
			const body = response.body ?? {};
			if (response.statusCode >= 400 || body.success === false) {
				const type = body.error?.type ?? `HTTP_${response.statusCode}`;
				throw new NodeApiError(this.getNode(), body as JsonObject, {
					message: `${type}: ${body.error?.message ?? 'The request failed'}`,
					httpCode: String(response.statusCode),
					itemIndex,
				});
			}
			return body;
		};

		for (let i = 0; i < items.length; i++) {
			// Typed n8n errors keep their HTTP context, so they are passed on as they are;
			// anything else is wrapped. Thrown after the try so the original is not lost.
			let failure: NodeApiError | NodeOperationError | undefined;
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'credits') {
					returnData.push({ json: await request('/v1/credits', {}, i), pairedItem: { item: i } });
					continue;
				}

				if (operation === 'list') {
					const platform = this.getNodeParameter('platform', i) as string;
					const body = await request('/v1/endpoints', { platform }, i);
					const endpoints = (body.endpoints as IDataObject[] | undefined) ?? [];
					for (const endpoint of endpoints) returnData.push({ json: endpoint, pairedItem: { item: i } });
					continue;
				}

				const path = (this.getNodeParameter('endpoint', i) as string).trim();
				if (!/^\/v1\/[a-z0-9]+(\/[a-z0-9_-]+)+$/i.test(path)) {
					throw new NodeOperationError(
						this.getNode(),
						`"${path}" is not an endpoint path. Expected something like /v1/tiktok/profile.`,
						{ itemIndex: i },
					);
				}
				const mapped = this.getNodeParameter('parameters', i, { value: null }) as {
					value: IDataObject | null;
				};
				const qs: IDataObject = {};
				for (const [key, value] of Object.entries(mapped.value ?? {})) {
					if (value === undefined || value === null || value === '') continue;
					qs[key] = value;
				}
				const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
				const maxPages = returnAll ? (this.getNodeParameter('maxPages', i, 5) as number) : 1;
				const output = this.getNodeParameter('output', i, 'rows') as string;

				for (let page = 1; page <= maxPages; page++) {
					const body = await request(path, qs, i);
					const rows = body.data?.items;
					if (output === 'response') {
						returnData.push({ json: body, pairedItem: { item: i } });
					} else if (Array.isArray(rows)) {
						for (const row of rows) returnData.push({ json: row as IDataObject, pairedItem: { item: i } });
					} else {
						returnData.push({
							json: body.data ?? body,
							pairedItem: { item: i },
						});
					}
					const next = body.pagination?.next_cursor;
					if (!next || body.pagination?.has_more === false) break;
					qs.cursor = next;
				}
			} catch (error) {
				failure =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
			if (failure) {
				if (!this.continueOnFail()) throw failure;
				returnData.push({ json: { error: failure.message }, pairedItem: { item: i } });
			}
		}

		return [returnData];
	}
}
