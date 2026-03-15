import type { StoreAdapter, RawProduct } from "../types";

const FRESHOP_BASE = "https://api.freshop.ncrcloud.com/1";
const IMAGE_BASE = "https://images.freshop.ncrcloud.com/";

interface Department {
  id: string;
  name: string;
  parent_id?: string;
  count: number;
  path?: string;
}

export abstract class FreshopAdapter implements StoreAdapter {
  abstract storeId: string;
  protected abstract appKey: string;
  protected abstract freshopStoreId: string;

  private token: string | null = null;

  private async getToken(): Promise<string> {
    if (this.token) return this.token;

    const res = await fetch("https://api.freshop.ncrcloud.com/2/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ app_key: this.appKey }),
    });

    if (!res.ok) {
      throw new Error(`Freshop session failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    this.token = data.token;
    if (!this.token) throw new Error("No token in Freshop session response");
    return this.token;
  }

  async fetch(): Promise<RawProduct[]> {
    const token = await this.getToken();

    // Get department tree
    const deptParams = new URLSearchParams({
      app_key: this.appKey,
      store_id: this.freshopStoreId,
      token,
      department_id_cascade: "true",
      include_departments: "true",
      limit: "0",
    });
    const deptRes = await fetch(`${FRESHOP_BASE}/products?${deptParams}`);
    const deptData = await deptRes.json();
    const allDepts: Department[] = deptData.departments || [];

    // Build maps
    const childrenOf = new Map<string, Department[]>();
    for (const dept of allDepts) {
      if (dept.parent_id) {
        const siblings = childrenOf.get(dept.parent_id) || [];
        siblings.push(dept);
        childrenOf.set(dept.parent_id, siblings);
      }
    }

    // Find leaf departments (no children) with products
    const leafDepts = allDepts.filter((d) => !childrenOf.has(d.id) && d.count > 0);
    console.log(`[${this.storeId}] Found ${leafDepts.length} leaf departments to fetch`);

    // Fetch products per leaf department (API caps at 100 per request)
    const seen = new Set<string>();
    const allProducts: RawProduct[] = [];

    for (let i = 0; i < leafDepts.length; i++) {
      const dept = leafDepts[i];
      const params = new URLSearchParams({
        app_key: this.appKey,
        store_id: this.freshopStoreId,
        token,
        department_id: dept.id,
        limit: "100",
        fields: "id,upc,name,size,cover_image,unit_price,sale_price,status,canonical_url,department_id,product_size",
      });

      try {
        const res = await fetch(`${FRESHOP_BASE}/products?${params}`);
        if (!res.ok) continue;

        const data = await res.json();
        const items: Record<string, unknown>[] = data.items || [];

        for (const item of items) {
          const id = String(item.id);
          if (seen.has(id)) continue;
          seen.add(id);

          const coverImage = item.cover_image as string | undefined;

          const unitPrice = (item.unit_price as number) ?? null;
          const salePriceVal = (item.sale_price as number) ?? null;
          const isPromo = salePriceVal != null && salePriceVal > 0 && unitPrice != null && unitPrice > 0 && salePriceVal < unitPrice;

          allProducts.push({
            sku: id,
            upc: (item.upc as string) || null,
            name: (item.name as string) || "",
            brand: null,
            description: null,
            price: unitPrice,
            salePrice: salePriceVal,
            unit: null,
            size: (item.product_size as string) || (item.size as string) || null,
            categoryRaw: dept.path || dept.name,
            imageUrl: coverImage ? `${IMAGE_BASE}${coverImage}_small.png` : null,
            inStock: item.status === "available",
            sourceUrl: (item.canonical_url as string) || null,
            rawData: item as Record<string, unknown>,
            isPromo,
            promoEndsAt: null,
          });
        }
      } catch (e) {
        console.error(`[${this.storeId}] Failed to fetch dept ${dept.name}: ${e}`);
      }

      if ((i + 1) % 50 === 0 || i === leafDepts.length - 1) {
        console.log(`[${this.storeId}] Processed ${i + 1}/${leafDepts.length} departments, ${allProducts.length} unique products`);
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`[${this.storeId}] Total: ${allProducts.length} unique products from ${leafDepts.length} departments`);
    return allProducts;
  }
}
