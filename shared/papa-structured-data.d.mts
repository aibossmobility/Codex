export interface PapaPageSchemaOptions {
  pathname: string;
  canonicalPath?: string;
  title: string;
  description: string;
  indexable?: boolean;
  course?: { name: string; description: string } | null;
}
export function schemaForPapaPage(options: PapaPageSchemaOptions): Record<string, unknown> | null;
export function withPapaPageSchema(html: string, options: PapaPageSchemaOptions): string;
