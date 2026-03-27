import { sanitizeText, sanitizeRichText } from './sanitize';

describe('Sanitization Utils', () => {
  describe('sanitizeText', () => {
    it('should strip all HTML tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(sanitizeText(input)).toBe('Hello  World');
    });

    it('should strip <img> tags with onerror', () => {
      const input = '<img src=x onerror="alert(1)">';
      expect(sanitizeText(input)).toBe('');
    });

    it('should strip inline event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      expect(sanitizeText(input)).toBe('Click me');
    });

    it('should remove javascript: protocol links', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      expect(sanitizeText(input)).toBe('Link');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      expect(sanitizeText(input)).toBe('Hello World');
    });

    it('should preserve plain text', () => {
      const input = 'Plain text with no HTML';
      expect(sanitizeText(input)).toBe('Plain text with no HTML');
    });

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should preserve HTML entities when they are literal text', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      expect(sanitizeText(input)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  describe('sanitizeRichText', () => {
    it('should allow safe formatting tags', () => {
      const input = '<p>Hello <b>bold</b> and <i>italic</i> text</p>';
      expect(sanitizeRichText(input)).toBe(
        '<p>Hello <b>bold</b> and <i>italic</i> text</p>',
      );
    });

    it('should strip script tags', () => {
      const input = '<p>Safe text</p><script>alert("xss")</script>';
      expect(sanitizeRichText(input)).toBe('<p>Safe text</p>');
    });

    it('should strip event handlers from allowed tags', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      expect(sanitizeRichText(input)).toBe('<p>Click me</p>');
    });

    it('should strip style attributes', () => {
      const input = '<p style="color:red">Styled text</p>';
      expect(sanitizeRichText(input)).toBe('<p>Styled text</p>');
    });

    it('should allow lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      expect(sanitizeRichText(input)).toBe(
        '<ul><li>Item 1</li><li>Item 2</li></ul>',
      );
    });

    it('should strip disallowed tags but keep content', () => {
      const input = '<div>Content in div</div>';
      expect(sanitizeRichText(input)).toBe('Content in div');
    });

    it('should strip iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>';
      expect(sanitizeRichText(input)).toBe('');
    });

    it('should strip link tags to prevent javascript: URIs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      expect(sanitizeRichText(input)).toBe('Link');
    });

    it('should trim whitespace', () => {
      const input = '  <p>Text</p>  ';
      expect(sanitizeRichText(input)).toBe('<p>Text</p>');
    });

    it('should handle nested allowed tags', () => {
      const input = '<p><strong><em>Nested</em></strong></p>';
      expect(sanitizeRichText(input)).toBe('<p><strong><em>Nested</em></strong></p>');
    });
  });
});
