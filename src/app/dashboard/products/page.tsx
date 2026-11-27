"use client";

import { useState } from "react";
import { Product } from "@/types";
import { usePermissions } from "@/lib/permissions";
import { formatCurrency } from "@/lib/currency";
import { apiFetch, ApiError } from "@/lib/api";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { ProductFormSlideOver } from "@/components/products/ProductFormSlideOver";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import {
  Plus,
  Search,
  X,
  Package,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Edit3,
  Trash2,
  Power,
  Filter,
} from "lucide-react";

export default function ProductsPage() {
  const toast = useToast();
  const { canManageProducts } = usePermissions();

  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [queryPage, setQueryPage] = useState(1);
  const [queryPerPage, setQueryPerPage] = useState(25);

  // In-flight row actions
  const [inFlightIds, setInFlightIds] = useState<Record<number, boolean>>({});

  // SlideOver states
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete / Deactivate dialogs
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const {
    items: products,
    total,
    currentPage,
    lastPage,
    perPage,
    from,
    to,
    isLoading,
    isFetching,
    error,
    isEmpty,
    refresh,
    retry,
    setData,
  } = usePaginatedList<Product>({
    endpoint: "/products",
    page: queryPage,
    perPage: queryPerPage,
    search: searchQuery,
    filters: {
      all: showInactive ? 1 : undefined,
      low_stock: lowStockOnly ? 1 : undefined,
    },
    sort: "name",
    direction: "asc",
    onPageChange: (p) => setQueryPage(p),
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsSlideOverOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsSlideOverOpen(true);
  };

  const handleSavedProduct = (savedProduct: Product, isEdit: boolean) => {
    if (isEdit) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((p) => (p.id === savedProduct.id ? savedProduct : p)),
        };
      });
    } else {
      refresh();
    }
  };

  const handleToggleActive = async (product: Product) => {
    const nextStatus = !product.is_active;
    setInFlightIds((prev) => ({ ...prev, [product.id]: true }));

    try {
      const response = await apiFetch<{ message: string; product: Product }>(
        `/products/${product.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextStatus }),
        }
      );

      const updated = response.product || { ...product, is_active: nextStatus };
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((p) => (p.id === product.id ? updated : p)),
        };
      });
      toast.success(
        response.message ||
          `Product "${product.name}" is now ${nextStatus ? "active" : "inactive"}.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update product status.");
    } finally {
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setIsDeleting(true);
    setInFlightIds((prev) => ({ ...prev, [target.id]: true }));

    try {
      const response = await apiFetch<{ message: string }>(`/products/${target.id}`, {
        method: "DELETE",
      });

      setDeleteTarget(null);
      toast.success(response.message || `Product "${target.name}" was deleted successfully.`);
      refresh();
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 409) {
        setDeleteTarget(null);
        setDeactivateTarget(target);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to delete product.");
      }
    } finally {
      setIsDeleting(false);
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const target = deactivateTarget;

    setIsDeactivating(true);
    setInFlightIds((prev) => ({ ...prev, [target.id]: true }));

    try {
      const response = await apiFetch<{ message: string; product: Product }>(
        `/products/${target.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }
      );

      const updated = response.product || { ...target, is_active: false };
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((p) => (p.id === target.id ? updated : p)),
        };
      });

      setDeactivateTarget(null);
      toast.success(
        response.message || `Product "${target.name}" has been deactivated.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate product.");
    } finally {
      setIsDeactivating(false);
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#33283D] tracking-tight">
            Products & Inventory
          </h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage consumable supplies and retail products, stock levels, and reservation usage.
          </p>
        </div>

        {canManageProducts && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] active:scale-[0.99] transition-all duration-150 shadow-xs cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EAE4F2] shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6F86]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setQueryPage(1);
            }}
            placeholder="Search by product name or SKU..."
            className="w-full pl-9 pr-9 py-2 text-sm border border-[#EAE4F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] bg-[#FAF8FC] hover:bg-white text-[#33283D] placeholder-[#7A6F86]/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setQueryPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#7A6F86] hover:text-[#33283D] cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toggle Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLowStockOnly((prev) => !prev);
              setQueryPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              lowStockOnly
                ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                : "bg-white text-[#7A6F86] border-[#EAE4F2] hover:bg-[#FAF8FC] hover:text-[#33283D]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowInactive((prev) => !prev);
              setQueryPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showInactive
                ? "bg-[#F0EAF7] text-[#7455A4] border-[#C9B8E2] shadow-2xs"
                : "bg-white text-[#7A6F86] border-[#EAE4F2] hover:bg-[#FAF8FC] hover:text-[#33283D]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Show Inactive</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#EAE4F2] p-16 flex flex-col items-center justify-center text-center">
          <Spinner className="w-8 h-8 text-[#7455A4]" />
          <p className="mt-3 text-sm text-[#7A6F86]">Loading products catalog...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-rose-900">{error}</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : isEmpty ? (
        <div className="bg-white rounded-2xl border border-[#EAE4F2] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F0EAF7] flex items-center justify-center text-[#7455A4] mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#33283D]">
            {searchQuery || lowStockOnly || showInactive
              ? "No matching products found"
              : "No products added yet"}
          </h3>
          <p className="text-xs text-[#7A6F86] max-w-sm mt-1">
            {searchQuery || lowStockOnly || showInactive
              ? "Try adjusting your search query or filter options above."
              : "Add your first retail or consumable spa product to track inventory and attach usage to reservations."}
          </p>
          {canManageProducts && !searchQuery && !lowStockOnly && !showInactive && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Product</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#EAE4F2] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE4F2] bg-[#FAF8FC] text-[11px] font-bold text-[#7A6F86] uppercase tracking-wider">
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-4 py-3.5">SKU</th>
                    <th className="px-4 py-3.5">Unit</th>
                    <th className="px-4 py-3.5">Price</th>
                    <th className="px-4 py-3.5">Stock Level</th>
                    <th className="px-4 py-3.5">Status</th>
                    {canManageProducts && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4F2] text-sm text-[#33283D]">
                  {products.map((product) => {
                    const isLowStock = product.stock_quantity <= product.low_stock_threshold;
                    const isOutOfStock = product.stock_quantity === 0;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-[#FAF8FC]/70 transition-colors ${
                          !product.is_active ? "opacity-60 bg-gray-50/50" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#33283D]">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-[#7A6F86] truncate max-w-xs mt-0.5">
                              {product.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-[#7455A4]">
                          {product.sku || "—"}
                        </td>
                        <td className="px-4 py-4 text-xs text-[#7A6F86]">
                          {product.unit}
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#33283D] whitespace-nowrap">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-4">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Out of stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Low: {product.stock_quantity} {product.unit}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {product.stock_quantity} {product.unit}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                              product.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                product.is_active ? "bg-emerald-500" : "bg-gray-400"
                              }`}
                            />
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {canManageProducts && (
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(product)}
                                disabled={inFlightIds[product.id]}
                                title={product.is_active ? "Deactivate product" : "Activate product"}
                                className="p-1.5 rounded-lg text-[#7A6F86] hover:text-[#33283D] hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(product)}
                                title="Edit product"
                                className="p-1.5 rounded-lg text-[#7455A4] hover:bg-[#F0EAF7] transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(product)}
                                disabled={inFlightIds[product.id]}
                                title="Delete product"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {products.map((product) => {
              const isLowStock = product.stock_quantity <= product.low_stock_threshold;
              const isOutOfStock = product.stock_quantity === 0;

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border border-[#EAE4F2] p-4 shadow-2xs space-y-3 ${
                    !product.is_active ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-[#33283D]">{product.name}</h4>
                      {product.sku && (
                        <span className="text-[11px] font-mono text-[#7455A4] block mt-0.5">
                          SKU: {product.sku}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-sm text-[#7455A4]">
                      {formatCurrency(product.price)}
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-xs text-[#7A6F86] line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#FAF8FC]">
                    <div className="flex items-center gap-2">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Out of stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Low: {product.stock_quantity} {product.unit}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Stock: {product.stock_quantity} {product.unit}
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          product.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {canManageProducts && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product)}
                          disabled={inFlightIds[product.id]}
                          className="p-1.5 rounded-lg text-[#7A6F86] hover:bg-gray-100"
                          title="Toggle active"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 rounded-lg text-[#7455A4] hover:bg-[#F0EAF7]"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          disabled={inFlightIds[product.id]}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            total={total}
            perPage={perPage}
            from={from}
            to={to}
            onPageChange={(p) => setQueryPage(p)}
            onPerPageChange={(pp) => {
              setQueryPerPage(pp);
              setQueryPage(1);
            }}
            disabled={isFetching}
          />
        </div>
      )}

      {/* SlideOver for Create & Edit */}
      <ProductFormSlideOver
        open={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        product={editingProduct}
        onSuccess={handleSavedProduct}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Product"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Product"
        confirmLoadingLabel="Deleting..."
        cancelLabel="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* 409 Conflict Dialog: Offer to deactivate instead */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Cannot Delete Product"
        description={
          deactivateTarget
            ? `"${deactivateTarget.name}" is attached to existing client reservations and cannot be deleted. Would you like to deactivate it instead so it is no longer selectable?`
            : ""
        }
        confirmLabel="Deactivate Product"
        confirmLoadingLabel="Deactivating..."
        cancelLabel="Keep Active"
        confirmClassName="bg-[#7455A4] hover:bg-[#5E4387] text-white"
        isConfirming={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  );
}

