import { useState } from "react";
import { useProducts, Product } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductPickerProps {
  websiteId: string;
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
  multiple?: boolean;
  maxSelection?: number;
}

export function ProductPicker({
  websiteId,
  selectedProductIds,
  onSelectionChange,
  multiple = true,
  maxSelection,
}: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<string | undefined>();

  const { data: products, isLoading, error } = useProducts({
    websiteId,
    search: search.length >= 2 ? search : undefined,
    stockStatus: stockFilter as any,
  });

  const handleProductToggle = (productId: string) => {
    if (!multiple) {
      onSelectionChange([productId]);
      return;
    }

    if (selectedProductIds.includes(productId)) {
      onSelectionChange(selectedProductIds.filter(id => id !== productId));
    } else {
      if (maxSelection && selectedProductIds.length >= maxSelection) {
        return;
      }
      onSelectionChange([...selectedProductIds, productId]);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'low_stock':
        return <AlertTriangle className="h-3 w-3 text-warning" />;
      case 'out_of_stock':
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getStockBadgeVariant = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'default';
      case 'low_stock':
        return 'secondary';
      case 'out_of_stock':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Failed to load products. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={stockFilter === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setStockFilter(undefined)}
          >
            All
          </Button>
          <Button
            variant={stockFilter === "in_stock" ? "default" : "outline"}
            size="sm"
            onClick={() => setStockFilter("in_stock")}
          >
            In Stock
          </Button>
          <Button
            variant={stockFilter === "low_stock" ? "default" : "outline"}
            size="sm"
            onClick={() => setStockFilter("low_stock")}
          >
            Low Stock
          </Button>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedProductIds.length > 0 && (
        <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
          <span className="text-sm">
            {selectedProductIds.length} product{selectedProductIds.length > 1 ? 's' : ''} selected
            {maxSelection && ` (max ${maxSelection})`}
          </span>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {/* Product Grid */}
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No products found</p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term' : 'Connect a store to sync products'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products?.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedProductIds.includes(product.id)}
                onToggle={() => handleProductToggle(product.id)}
                disabled={
                  !selectedProductIds.includes(product.id) &&
                  maxSelection !== undefined &&
                  selectedProductIds.length >= maxSelection
                }
                getStockStatusIcon={getStockStatusIcon}
                getStockBadgeVariant={getStockBadgeVariant}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  getStockStatusIcon: (status: string) => React.ReactNode;
  getStockBadgeVariant: (status: string) => string;
}

function ProductCard({
  product,
  isSelected,
  onToggle,
  disabled,
  getStockStatusIcon,
  getStockBadgeVariant,
}: ProductCardProps) {
  return (
    <div
      className={cn(
        "relative border rounded-lg p-3 cursor-pointer transition-all",
        isSelected && "border-primary ring-2 ring-primary/20",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && !isSelected && "hover:border-primary/50"
      )}
      onClick={() => !disabled && onToggle()}
    >
      {/* Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => !disabled && onToggle()}
          disabled={disabled}
        />
      </div>

      {/* Product Image */}
      <div className="aspect-square mb-3 bg-muted rounded-md overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-1">
        <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
        
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">
            {product.currency === 'USD' ? '$' : product.currency}
            {product.price?.toFixed(2) || '0.00'}
          </span>
          
          {product.compare_at_price && product.compare_at_price > (product.price || 0) && (
            <span className="text-xs text-muted-foreground line-through">
              ${product.compare_at_price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="flex items-center gap-1.5">
          {getStockStatusIcon(product.stock_status)}
          <Badge variant={getStockBadgeVariant(product.stock_status) as any} className="text-xs">
            {product.stock_status === 'in_stock' && 'In Stock'}
            {product.stock_status === 'low_stock' && `${product.stock_quantity || 'Low'} left`}
            {product.stock_status === 'out_of_stock' && 'Out of Stock'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
