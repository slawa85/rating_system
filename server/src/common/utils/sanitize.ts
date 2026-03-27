import sanitizeHtml from 'sanitize-html';

/**
 * Strips all HTML tags and attributes from input.
 * Use for: names, titles, emails, SKUs - any field that should be plain text.
 */
export function sanitizeText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

/**
 * Allows basic safe formatting tags but strips scripts and dangerous attributes.
 * Use for: descriptions, review bodies - fields where basic formatting is acceptable.
 * Allowed: bold, italic, emphasis, paragraphs, line breaks, lists.
 */
export function sanitizeRichText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
    allowedSchemes: [], // No links to prevent javascript: and data: URIs
  }).trim();
}
