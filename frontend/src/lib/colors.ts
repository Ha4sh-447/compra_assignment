/**
 * Semantic role → colour map for SVG wireframe rendering.
 */

export const ROLE_COLORS: Record<string, string> = {
  headline: '#ff6b9d',
  subheadline: '#c56cf0',
  offer_text: '#ffa502',
  offer_badge: '#ffdd59',
  social_proof: '#7bed9f',
  product_image: '#70a1ff',
  background: '#57606f',
  rating_icon: '#ff6348',
  artboard: '#2ed573',
  image: '#70a1ff',
  text: '#a29bfe',
  shape: '#ffdd59',
};

export function getRoleColor(role?: string, type?: string): string {
  if (role && ROLE_COLORS[role]) return ROLE_COLORS[role];
  if (type && ROLE_COLORS[type]) return ROLE_COLORS[type];
  return '#999';
}
