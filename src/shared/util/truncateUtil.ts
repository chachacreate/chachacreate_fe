import { detectContentType, sanitizeHtml, convertMarkdownToHtml } from './contentUtil';

/**
 * HTML 텍스트에서 태그를 제거하고 텍스트만 추출하는 함수
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&nbsp;/g, ' ') // HTML 엔티티 디코딩
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ') // 연속된 공백을 하나로
    .trim();
}

/**
 * 개선된 truncateText 함수 - HTML/마크다운 처리 + 무조건 말줄임표
 */
const truncateText = (text: string, length: number): string => {
  if (!text) return '';

  const contentType = detectContentType(text);
  let plainText = text;

  // HTML이나 마크다운인 경우 텍스트만 추출
  if (contentType === 'html') {
    plainText = stripHtmlTags(sanitizeHtml(text));
  } else if (contentType === 'markdown') {
    const htmlText = convertMarkdownToHtml(text);
    plainText = stripHtmlTags(htmlText);
  }

  // 길이 체크 후 자르기
  return plainText.length > length ? plainText.slice(0, length) + '…' : plainText;
};

export { truncateText };
