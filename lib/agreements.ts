export type TemplateBody = Record<string, any>;

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };


const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  if (v instanceof Date) return v.toISOString();
  // For objects/arrays, provide JSON string so the template stays printable.
  return JSON.stringify(v);
}

function collectPlaceholdersFromString(text: string): string[] {
  const out: string[] = [];



  // Avoid matchAll iteration typing issues by using exec loop.
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    const key = match[1];
    if (key && out.indexOf(key) === -1) out.push(key);

  }

  // Reset regex state since it's global.
  PLACEHOLDER_REGEX.lastIndex = 0;
  // Convert to array without relying on Set iteration.
  const arr: string[] = [];
  out.forEach((v) => arr.push(v));
  return arr;
}



function walkTemplate(value: any, fn: (s: string) => void) {

  if (value === null || value === undefined) return;
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) {
    for (const item of value) walkTemplate(item, fn);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) walkTemplate(v, fn);
  }
}

export function listTemplatePlaceholders(template_body: TemplateBody): string[] {
  const placeholders: string[] = [];
  const seen = new Set<string>();

  walkTemplate(template_body, (s) => {
    const ks = collectPlaceholdersFromString(s);
    ks.forEach((k) => {
      if (!seen.has(k)) {
        seen.add(k);
        placeholders.push(k);
      }
    });
  });

  return placeholders;
}


export function renderTemplatePlaceholders(template_body: TemplateBody, filled_data: Record<string, any>) {
  const missing = new Set<string>();

  const renderValue = (val: any): any => {
    if (val === null || val === undefined) return val;

    if (typeof val === 'string') {
      return val.replace(PLACEHOLDER_REGEX, (_full, key: string) => {
        if (!(key in filled_data) || filled_data[key] === null || filled_data[key] === undefined) {
          missing.add(key);
          return '';
        }
        return stringifyValue(filled_data[key]);
      });
    }

    if (Array.isArray(val)) return val.map(renderValue);

    if (typeof val === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) out[k] = renderValue(v);
      return out;
    }

    return val;
  };

  const rendered = renderValue(template_body);
  const missingArr: string[] = [];
  missing.forEach((m) => {
    if (missingArr.indexOf(m) === -1) missingArr.push(m);
  });
  return { rendered, missing: missingArr };
}



export function assertNoTemplatePlaceholdersMissing(missing: string[]) {
  if (missing.length > 0) {
    // Keep stable ordering for easier debugging.
    missing.sort();
    const err = new Error(`Missing required template fields: ${missing.join(', ')}`);
    (err as any).missingFields = missing;
    throw err;
  }
}

export type AgreementTemplateResolved = {
  text: string;
  placeholderKeys: string[];
  renderedTemplateBody: Json;
};

export function resolveTemplateToText({
  template_body,
  filled_data,
}: {
  template_body: TemplateBody;
  filled_data: Record<string, any>;
}): AgreementTemplateResolved {
  const { rendered, missing } = renderTemplatePlaceholders(template_body, filled_data);
  assertNoTemplatePlaceholdersMissing(missing);
  const placeholderKeys = listTemplatePlaceholders(template_body);



  // Heuristic: use `template_body.body` if present, otherwise stringify the whole rendered body.
  const text =
    typeof rendered?.body === 'string'
      ? rendered.body
      : typeof rendered?.template === 'string'
        ? rendered.template
        : JSON.stringify(rendered, null, 2);

  return {
    text,
    placeholderKeys,
    renderedTemplateBody: rendered as unknown as Json,
  };
}

