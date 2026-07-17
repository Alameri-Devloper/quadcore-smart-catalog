export const PRODUCT_ENTRY_REVIEW_POLICY = {
  version: "1.0",
  score: {
    identity: { maximum: 20, rules: [4, 4, 4, 4, 4] },
    specifications: { maximum: 30 },
    commercial: { maximum: 25, rules: [5, 4, 4, 4, 4, 4] },
    images: { maximum: 15, rules: [5, 4, 3, 3] },
    presentation: { maximum: 10, rules: [3, 3, 2, 2] },
  },
  labels: [
    { minimum: 90, label: "Excellent" },
    { minimum: 75, label: "Good" },
    { minimum: 60, label: "Needs Improvement" },
    { minimum: 0, label: "Incomplete" },
  ],
} as const;

