export { parseLyricsText, loadLyricsFromServer } from './lyrics';

/**
 * 转义 HTML，防止 XSS 攻击
 */
export function escapeHtml(text: string): string {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
