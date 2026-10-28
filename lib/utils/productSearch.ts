export const productSearchFields = ['name', 'sku', 'barcode', 'partNumber', 'carMake', 'carModel', 'variant', 'color', 'location'] as const;

export function productSearchTokens(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesProductSearch(product: any, query: string) {
  const text = [...productSearchFields.map(field => product[field]), product.yearFrom, product.yearTo]
    .filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
  return productSearchTokens(query).every(token => text.includes(token) || (/^\d{4}$/.test(token)
    && Number(product.yearFrom) > 0 && Number(product.yearFrom) <= Number(token)
    && (!product.yearTo || Number(product.yearTo) >= Number(token))));
}

export function escapeProductSearch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
