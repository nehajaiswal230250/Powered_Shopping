export const getTrendingProducts = (products, limit = 6) => {
  return [...products]
    .sort((a, b) => b.rating.rate * b.rating.count - a.rating.rate * a.rating.count)
    .slice(0, limit);
};

export const getSimilarProducts = (products, category, excludeId = null, limit = 4) => {
  if (!category) return [];
  return products
    .filter((p) => p.category.toLowerCase() === category.toLowerCase() && p.id !== excludeId)
    .sort((a, b) => b.rating.rate - a.rating.rate)
    .slice(0, limit);
};
