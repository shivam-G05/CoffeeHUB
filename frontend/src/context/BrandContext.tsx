import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface Brand {
  name: string;
  tagline: string;
  supportEmail: string;
}

// Defaults render immediately; the admin-configured values replace them once loaded,
// so the platform can be renamed from Admin > Settings without a code change.
const fallback: Brand = { name: "CoffeeHub", tagline: "India's coffee marketplace", supportEmail: "support@coffeehub.in" };

const BrandContext = createContext<Brand>(fallback);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>(fallback);

  useEffect(() => {
    api
      .get<Record<string, string>>("/api/settings/public")
      .then((res) =>
        setBrand({
          name: res.data.brand_name || fallback.name,
          tagline: res.data.brand_tagline || fallback.tagline,
          supportEmail: res.data.support_email || fallback.supportEmail,
        }),
      )
      .catch(() => undefined);
  }, []);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
