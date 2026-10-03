import type {
	FieldType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
} from 'n8n-workflow';

/**
 * Everything the node shows about endpoints comes from the public catalogue,
 * GET /v1/endpoints (free, no key). Nothing is hard-coded here, so a new
 * endpoint, parameter or price shows up in n8n without a new release.
 */

export const DEFAULT_BASE_URL = 'https://api.insightsocial.app';

export interface CatalogueParam {
	name: string;
	type: string;
	required: boolean;
	in?: string;
	description?: string;
	enum?: string[];
	one_of_group?: string;
}

export interface CatalogueEndpoint {
	path: string;
	method?: string;
	platform: string;
	group?: string;
	label: string;
	description?: string;
	credits: number | { min: number; max: number };
	paginates?: boolean;
	available?: boolean;
	params: CatalogueParam[];
}

export function priceLabel(credits: CatalogueEndpoint['credits']): string {
	if (typeof credits === 'number') return `${credits} credits`;
	if (credits.min === credits.max) return `${credits.min} credits`;
	return `${credits.min}-${credits.max} credits, metered`;
}

/** The catalogue lists a few POST endpoints the API does not serve yet; only offer callable ones. */
export function isCallable(endpoint: CatalogueEndpoint): boolean {
	return (endpoint.method ?? 'GET') === 'GET' && endpoint.available !== false;
}

export async function baseUrlFor(context: ILoadOptionsFunctions): Promise<string> {
	try {
		const credentials = await context.getCredentials('insightSocialApi');
		const baseUrl = String(credentials.baseUrl || DEFAULT_BASE_URL);
		return baseUrl.replace(/\/+$/, '');
	} catch {
		return DEFAULT_BASE_URL;
	}
}

export async function fetchCatalogue(
	context: ILoadOptionsFunctions,
	platform?: string,
): Promise<CatalogueEndpoint[]> {
	const baseUrl = await baseUrlFor(context);
	const response = (await context.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/v1/endpoints`,
		qs: platform ? { platform } : {},
		json: true,
	})) as { endpoints?: CatalogueEndpoint[] };
	return (response.endpoints ?? []).filter(isCallable);
}

function firstParagraph(text: string | undefined): string {
	return (text ?? '').split(/\n\s*\n/)[0].trim();
}

export function toEndpointOptions(endpoints: CatalogueEndpoint[]): INodePropertyOptions[] {
	return endpoints.map((endpoint) => ({
		name: `${endpoint.label} (${priceLabel(endpoint.credits)})`,
		value: endpoint.path,
		description: `${endpoint.path}: ${firstParagraph(endpoint.description)}`,
	}));
}

function fieldType(param: CatalogueParam): FieldType {
	if (param.enum && param.enum.length > 0) return 'options';
	if (param.type === 'integer' || param.type === 'number') return 'number';
	if (param.type === 'boolean') return 'boolean';
	return 'string';
}

export function toResourceFields(endpoint: CatalogueEndpoint): ResourceMapperField[] {
	return endpoint.params
		.filter((param) => (param.in ?? 'query') === 'query')
		.map((param) => {
			const oneOf = param.one_of_group
				? ` (give at least one of: ${param.one_of_group.split('|').join(', ')})`
				: '';
			const field: ResourceMapperField = {
				id: param.name,
				displayName: `${param.name}${oneOf}`,
				required: param.required,
				defaultMatch: false,
				canBeUsedToMatch: false,
				display: true,
				type: fieldType(param),
			};
			if (param.enum && param.enum.length > 0) {
				field.options = param.enum.map((value) => ({ name: value, value }));
			}
			return field;
		});
}
