// ─── Layout ───────────────────────────────────────────────────────────────────
export const SIDEBAR_WIDTH = 360;
export const APPBAR_HEIGHT = 64;

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export const ACCORDION_SECTIONS: { id: string; label: string }[] = [
  { id: "countries", label: "Company Country" },
  { id: "companyCategories", label: "Company Category" },
  { id: "techList", label: "Technologies" },
  { id: "numberOfTech", label: "Number of Technologies" },
  { id: "techCategoryList", label: "Technology Categories" },
];

export const COUNTRY_NAME_MAP: Record<string, string> = {
  AT: "Austria",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  GB: "Great Britain",
  HK: "Hong Kong",
  NL: "Netherlands",
  US: "United States",
};
