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
  return DOMPurify.sanitize(htmlString);
}

/**
 * 마크다운을 HTML로 변환합니다
 */
export function convertMarkdownToHtml(markdown?: string): string {
  if (!markdown) return '';

  let html = markdown;

  // 헤딩 변환 (# ## ### #### ##### ######)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // 볼드 변환 (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 이탤릭 변환 (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 코드 블록 변환 (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // 인라인 코드 변환 (`code`)
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // 이미지 변환 ![alt](url) - 링크보다 먼저 처리해야 함
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-4" loading="lazy" />'
  );

  // 링크 변환 [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 리스트 변환
  // 순서 없는 리스트 (*, -, +)
  html = html.replace(/^[\s]*[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // 순서 있는 리스트 (1. 2. 3.)
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // 이미 ul로 감싸지지 않은 li들을 ol로 감싸기
  html = html.replace(/(<li>.*<\/li>)(?![\s\S]*<\/ul>)/s, '<ol>$1</ol>');

  // 인용문 변환 (> text)
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // 구분선 변환 (---, ***, ___)
  html = html.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '<hr>');

  // 단락 변환 (빈 줄로 구분된 텍스트)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .map((para) => {
      const trimmed = para.trim();
      // 이미 HTML 태그로 시작하는 경우 그대로 둠
      if (trimmed.match(/^<(h[1-6]|ul|ol|blockquote|hr|pre|img)/)) {
        return trimmed;
      }
      // 빈 문자열이 아닌 경우 p 태그로 감싸기
      return trimmed ? `<p>${trimmed}</p>` : '';
    })
    .filter((para) => para.length > 0)
    .join('\n');

  return html;
}

/**
 * 일반 텍스트를 HTML로 변환합니다 (줄바꿈을 p 태그로 처리)
 */
export function formatPlainText(text?: string): string {
  if (!text) return '';
  // 일반 텍스트를 HTML로 변환 (줄바꿈 처리)
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${line}</p>`)
    .join('');
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
