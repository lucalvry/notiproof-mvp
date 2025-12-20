import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { toast } from 'sonner';

export interface Product {
  id: string;
  website_id: string;
  integration_id: string | null;
  external_id: string;
  title: string;
  description: string | null;
  handle: string | null;
  product_url: string | null;
  image_url: string | null;
  images: string[];
  price: number | null;
  compare_at_price: number | null;
  currency: string;
  stock_quantity: number | null;
  stock_status: string;
  variants: any[];
  tags: string[];
  category: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseProductsOptions {
  websiteId?: string;
  integrationId?: string;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  search?: string;
  limit?: number;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { currentWebsite } = useWebsiteContext();
  const websiteId = options.websiteId || currentWebsite?.id;

  return useQuery({
    queryKey: ['products', websiteId, options],
    queryFn: async () => {
      if (!websiteId) return [];

      let query = supabase
        .from('products')
        .select('*')
        .eq('website_id', websiteId)
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (options.integrationId) {
        query = query.eq('integration_id', options.integrationId);
      }

      if (options.stockStatus) {
        query = query.eq('stock_status', options.stockStatus);
      }

      if (options.search) {
        query = query.ilike('title', `%${options.search}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!websiteId,
  });
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!productId,
  });
}

export function useSyncProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      integrationType, 
      connectorId, 
      websiteId 
    }: { 
      integrationType: 'shopify' | 'woocommerce';
      connectorId: string;
      websiteId: string;
    }) => {
      const functionName = integrationType === 'shopify' 
        ? 'sync-shopify-products' 
        : 'sync-woocommerce-products';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'sync',
          connector_id: connectorId,
          website_id: websiteId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Synced ${data?.products_synced || 0} products`);
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}

export function useProductStats(websiteId?: string) {
  const { currentWebsite } = useWebsiteContext();
  const effectiveWebsiteId = websiteId || currentWebsite?.id;

  return useQuery({
    queryKey: ['product-stats', effectiveWebsiteId],
    queryFn: async () => {
      if (!effectiveWebsiteId) return null;

      const { data, error } = await supabase
        .from('products')
        .select('stock_status, price')
        .eq('website_id', effectiveWebsiteId)
        .eq('is_active', true);

      if (error) throw error;

      const total = data.length;
      const inStock = data.filter(p => p.stock_status === 'in_stock').length;
      const lowStock = data.filter(p => p.stock_status === 'low_stock').length;
      const outOfStock = data.filter(p => p.stock_status === 'out_of_stock').length;
      const avgPrice = data.reduce((sum, p) => sum + (p.price || 0), 0) / (total || 1);

      return {
        total,
        inStock,
        lowStock,
        outOfStock,
        avgPrice,
      };
    },
    enabled: !!effectiveWebsiteId,
  });
}
