export const productSearchFields = ['name', 'sku', 'barcode', 'partNumber', 'carMake', 'carModel', 'variant', 'color', 'location'] as const;

export function productSearchTokens(query: string) {
  return query.trim().toLowerCase().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0))).split(/\s+/).filter(Boolean);
}

export function matchesProductSearch(product: any, query: string) {
  const text = [...productSearchFields.map(field => product[field]), product.yearFrom, product.yearTo]
    .filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
  return productSearchTokens(query).every(token => new RegExp(productSearchPattern(token), 'i').test(text) || (/^\d{4}$/.test(token)
    && Number(product.yearFrom) > 0 && Number(product.yearFrom) <= Number(token)
    && (!product.yearTo || Number(product.yearTo) >= Number(token))));
}

export function escapeProductSearch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function productSearchPattern(token: string) {
  return Array.from(token).map(char => /\d/.test(char)
    ? `[${char}${String.fromCharCode(0x660 + Number(char))}${String.fromCharCode(0x6f0 + Number(char))}]`
    : escapeProductSearch(char)).join('\\s*');
}
