import DOMPurify from 'dompurify';

export type ContentType = 'html' | 'markdown' | 'plain';

/**
 * 텍스트 콘텐츠의 타입을 감지합니다 (HTML, 마크다운, 일반 텍스트)
 */
export function detectContentType(text?: string): ContentType {
  if (!text) return 'plain';

  // HTML 태그가 포함되어 있는지 확인
  const htmlTagRegex = /<[^>]*>/;
  if (htmlTagRegex.test(text)) {
    return 'html';
  }

  // 마크다운 패턴 확인
  const markdownPatterns = [
    /^#{1,6}\s+/m, // 헤딩 (#, ##, ###)
    /\*\*.*?\*\*/, // 볼드 (**text**)
    /\*.*?\*/, // 이탤릭 (*text*)
    /^\s*[\*\-\+]\s+/m, // 리스트 (*, -, +)
    /^\s*\d+\.\s+/m, // 번호 리스트 (1. )
    /\[.*?\]\(.*?\)/, // 링크 [text](url)
    /!\[.*?\]\(.*?\)/, // 이미지 ![alt](url)
    /```[\s\S]*?```/, // 코드 블록
    /`.*?`/, // 인라인 코드
    /^\s*>\s+/m, // 인용문 (>)
    /^\s*---+\s*$/m, // 구분선 (---)
  ];

  const hasMarkdown = markdownPatterns.some((pattern) => pattern.test(text));
  return hasMarkdown ? 'markdown' : 'plain';
}

/**
 * HTML 문자열을 DOMPurify로 안전하게 정제합니다
 */
export function sanitizeHtml(htmlString?: string): string {
  if (!htmlString) return '';

  // DOMPurify 설정을 더 관대하게 변경
  return DOMPurify.sanitize(htmlString, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'sup',
      'sub',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'blockquote',
      'pre',
      'code',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
      'div',
      'span',
      'hr',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'title',
      'src',
      'alt',
      'width',
      'height',
      'loading',
      'class',
      'id',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'loading'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  });
}

/**
 * 마크다운을 HTML로 변환합니다 (개선된 버전)
 */
export function convertMarkdownToHtml(markdown?: string): string {
  if (!markdown) return '';

  let html = markdown;

  // 1. 코드 블록을 먼저 처리 (다른 변환에 영향받지 않도록)
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return `__CODE_BLOCK_${index}__`;
  });

  // 2. 인라인 코드 처리
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const index = inlineCodes.length;
    inlineCodes.push(`<code>${code}</code>`);
    return `__INLINE_CODE_${index}__`;
  });

  // 3. 이미지 변환 (링크보다 먼저 처리)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-4" loading="lazy" />'
  );

  // 4. 링크 변환
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 5. 헤딩 변환 (줄 단위로 처리)
  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

  // 6. 구분선 변환 (단락 분리 전에 처리)
  html = html.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '<hr>');

  // 7. 인용문 변환 (연속된 인용문 처리)
  html = html.replace(/^>\s*(.*)$/gm, '__QUOTE__$1');
  html = html.replace(/(__QUOTE__.*(?:\n__QUOTE__.*)*)/gm, (match) => {
    const content = match.replace(/__QUOTE__/g, '').trim();
    return `<blockquote>${content}</blockquote>`;
  });

  // 8. 볼드와 이탤릭 변환 (순서 중요: 볼드를 먼저)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 9. 리스트 처리 (개선된 방식)
  html = convertLists(html);

  // 10. 단락 변환 (빈 줄로 구분)
  html = convertParagraphs(html);

  // 11. 코드 블록과 인라인 코드 복원
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });

  return html.trim();
}

/**
 * 리스트를 처리하는 헬퍼 함수
 */
function convertLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inOrderedList = false;
  let inUnorderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 순서 있는 리스트 항목 확인
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    // 순서 없는 리스트 항목 확인
    const unorderedMatch = trimmed.match(/^[\*\-\+]\s+(.+)$/);

    if (orderedMatch) {
      if (!inOrderedList) {
        if (inUnorderedList) {
          result.push('</ul>');
          inUnorderedList = false;
        }
        result.push('<ol>');
        inOrderedList = true;
      }
      result.push(`<li>${orderedMatch[2]}</li>`);
    } else if (unorderedMatch) {
      if (!inUnorderedList) {
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
        }
        result.push('<ul>');
        inUnorderedList = true;
      }
      result.push(`<li>${unorderedMatch[1]}</li>`);
    } else {
      // 리스트가 아닌 줄
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      if (inUnorderedList) {
        result.push('</ul>');
        inUnorderedList = false;
      }
      result.push(line);
    }
  }

  // 마지막에 열린 리스트 태그 닫기
  if (inOrderedList) result.push('</ol>');
  if (inUnorderedList) result.push('</ul>');

  return result.join('\n');
}

/**
 * 단락을 처리하는 헬퍼 함수
 */
function convertParagraphs(html: string): string {
  // 빈 줄로 분리하여 단락 구분
  const blocks = html.split(/\n\s*\n/);

  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // 이미 HTML 태그로 시작하는 블록들은 그대로 둠
      const htmlBlockTags = /^<(h[1-6]|ul|ol|blockquote|hr|pre|div|img|table)/i;
      if (htmlBlockTags.test(trimmed)) {
        return trimmed;
      }

      // 여러 줄로 된 일반 텍스트를 하나의 단락으로 처리
      const lines = trimmed
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);
      if (lines.length === 0) return '';

      const content = lines.join(' ');
      return `<p>${content}</p>`;
    })
    .filter((block) => block.length > 0)
    .join('\n\n');
}

/**
 * 일반 텍스트를 HTML로 변환합니다 (줄바꿈을 p 태그로 처리)
 */
export function formatPlainText(text?: string): string {
  if (!text) return '';

  // 빈 줄로 단락을 구분
  const paragraphs = text.split(/\n\s*\n/);

  return paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';

      // 단락 내의 줄바꿈은 공백으로 처리
      const content = trimmed
        .split('\n')
        .map((line) => line.trim())
        .join(' ');
      return `<p>${content}</p>`;
    })
    .filter((para) => para.length > 0)
    .join('\n');
}

/**
 * 콘텐츠 타입에 따라 적절히 변환하고 정제합니다
 */
export function processContent(content?: string): {
  sanitizedDescription: string;
  contentType: ContentType;
} {
  if (!content) return { sanitizedDescription: '', contentType: 'plain' };

  const type = detectContentType(content);

  switch (type) {
    case 'html':
      return {
        sanitizedDescription: sanitizeHtml(content),
        contentType: 'html',
      };
    case 'markdown':
      return {
        sanitizedDescription: sanitizeHtml(convertMarkdownToHtml(content)),
        contentType: 'markdown',
      };
    default:
      return {
        sanitizedDescription: formatPlainText(content),
        contentType: 'plain',
      };
  }
}

/**
 * 콘텐츠 타입에 따른 CSS 클래스를 반환합니다
 */
export function getContentCssClasses(contentType: ContentType): string {
  if (contentType === 'html' || contentType === 'markdown') {
    return 'formatted-content prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-sm prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-li:mb-1 prose-strong:text-gray-900 prose-strong:font-semibold prose-em:text-gray-800 prose-em:italic prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 prose-hr:border-gray-200 prose-hr:my-6 prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-img:rounded-lg prose-img:shadow-sm prose-img:my-4';
  }
  return 'plain-text-content space-y-4';
}
