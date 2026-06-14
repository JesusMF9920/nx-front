import { apiFetch } from "./client";
import type {
  ApiDimensionConfig,
  ApiList,
  ApiPriceTier,
  ApiProduct,
  ApiProductDetail,
  ApiProductSource,
  ApiRecipeItem,
  ApiVariantType,
} from "./types";

export type CreateProductInput = {
  sku: string;
  name: string;
  category: string;
  method?: string | null;
  source: ApiProductSource;
  supplierName?: string | null;
  leadDays?: number;
  price: number;
  cost: number;
  stock?: number;
  unit?: string;
  needsApproval?: boolean;
  claveProdServ?: string | null;
  claveUnidad?: string | null;
  objetoImpuesto?: string | null;
  variantType?: ApiVariantType;
  dimensionConfig?: ApiDimensionConfig | null;
  sizeSurcharges?: Record<string, number> | null;
  /** Mayoreo por volumen. Independiente del variantType. */
  priceTiers?: ApiPriceTier[] | null;
  sizedFromMaterialId?: string | null;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type ProductVariantInput = {
  code: string;
  label: string;
  /** Omitir en una variante existente preserva su valor actual. */
  priceMod?: number;
  stock?: number;
  sortOrder?: number;
};

export type RecipeItemInput = {
  materialId: string;
  qty: number;
  byVariant?: boolean;
  note?: string | null;
};

export type ListProductsParams = {
  skip?: number;
  take?: number;
  search?: string;
  category?: string;
  source?: ApiProductSource;
  isActive?: boolean;
  orderBy?: "name" | "sku" | "createdAt" | "updatedAt" | "price" | "stock";
  order?: "asc" | "desc";
};

export const catalogApi = {
  list(params: ListProductsParams = {}): Promise<ApiList<ApiProduct>> {
    const search = new URLSearchParams();
    if (params.skip !== undefined) search.set("skip", String(params.skip));
    if (params.take !== undefined) search.set("take", String(params.take));
    if (params.search?.trim()) search.set("search", params.search.trim());
    if (params.category) search.set("category", params.category);
    if (params.source) search.set("source", params.source);
    if (params.isActive !== undefined) {
      search.set("isActive", params.isActive ? "true" : "false");
    }
    if (params.orderBy) search.set("orderBy", params.orderBy);
    if (params.order) search.set("order", params.order);
    const qs = search.toString();
    return apiFetch<ApiList<ApiProduct>>(`/products${qs ? `?${qs}` : ""}`);
  },

  /** Categorías distintas (productos activos), ordenadas — para poblar filtros. */
  categories(): Promise<string[]> {
    return apiFetch<string[]>(`/products/categories`);
  },

  get(id: string): Promise<ApiProductDetail> {
    return apiFetch<ApiProductDetail>(`/products/${id}`);
  },

  setVariants(id: string, variants: ProductVariantInput[]): Promise<void> {
    return apiFetch<void>(`/products/${id}/variants`, {
      method: "PUT",
      body: JSON.stringify({ variants }),
    });
  },

  getRecipe(id: string): Promise<{ items: ApiRecipeItem[] }> {
    return apiFetch<{ items: ApiRecipeItem[] }>(`/products/${id}/recipe`);
  },

  setRecipe(id: string, items: RecipeItemInput[]): Promise<void> {
    return apiFetch<void>(`/products/${id}/recipe`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },

  create(input: CreateProductInput): Promise<{ id: string }> {
    return apiFetch<{ id: string }>("/products", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(id: string, patch: UpdateProductInput): Promise<void> {
    return apiFetch<void>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deactivate(id: string): Promise<void> {
    return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
  },

  activate(id: string): Promise<void> {
    return apiFetch<void>(`/products/${id}/activate`, { method: "POST" });
  },
};
