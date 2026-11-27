"use client";

import { useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { apiFetch, ApiError } from "@/lib/api";
import { Product } from "@/types";
import { Edit3, Plus } from "lucide-react";

interface ProductFormSlideOverProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: (savedProduct: Product, isEdit: boolean) => void;
}

export function ProductFormSlideOver({
  open,
  onClose,
  product,
  onSuccess,
}: ProductFormSlideOverProps) {
  const toast = useToast();
  const isEdit = Boolean(product);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    unit: "unit",
    price: "",
    stock_quantity: "0",
    low_stock_threshold: "5",
    description: "",
    is_active: true,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevProduct, setPrevProduct] = useState(product);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen || product !== prevProduct) {
    setPrevOpen(open);
    setPrevProduct(product);
    setFieldErrors({});
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || "",
        unit: product.unit || "unit",
        price: String(product.price),
        stock_quantity: String(product.stock_quantity),
        low_stock_threshold: String(product.low_stock_threshold),
        description: product.description || "",
        is_active: product.is_active,
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        unit: "unit",
        price: "",
        stock_quantity: "0",
        low_stock_threshold: "5",
        description: "",
        is_active: true,
      });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string[]> = {};
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = ["Product name is required."];
    } else if (trimmedName.length > 255) {
      errors.name = ["Product name must not exceed 255 characters."];
    }

    if (formData.sku && formData.sku.trim().length > 100) {
      errors.sku = ["SKU must not exceed 100 characters."];
    }

    if (formData.unit && formData.unit.trim().length > 30) {
      errors.unit = ["Unit must not exceed 30 characters."];
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = ["Price must be a number greater than or equal to 0."];
    }

    const stockNum = parseInt(formData.stock_quantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      errors.stock_quantity = ["Stock quantity must be an integer greater than or equal to 0."];
    }

    const thresholdNum = parseInt(formData.low_stock_threshold, 10);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      errors.low_stock_threshold = ["Low stock threshold must be an integer greater than or equal to 0."];
    }

    if (formData.description && formData.description.length > 2000) {
      errors.description = ["Description must not exceed 2000 characters."];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        sku: formData.sku.trim() || null,
        unit: formData.unit.trim() || "unit",
        price: priceNum,
        stock_quantity: stockNum,
        low_stock_threshold: thresholdNum,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      if (isEdit && product) {
        const res = await apiFetch<{ message: string; product: Product }>(
          `/products/${product.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
        toast.success(res.message || "Product updated successfully.");
        onSuccess(res.product, true);
      } else {
        const res = await apiFetch<{ message: string; product: Product }>("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(res.message || "Product created successfully.");
        onSuccess(res.product, false);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        const data = err.data as { errors?: Record<string, string[]>; message?: string };
        if (data?.errors) {
          setFieldErrors(data.errors);
        } else {
          toast.error(err.message || "Validation failed.");
        }
      } else {
        toast.error(err instanceof Error ? err.message : "An error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white ${
      fieldErrors[field]
        ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
        : "border-[#EAE4F2] focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] text-[#33283D]"
    }`;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "New Product"}
      description={
        isEdit
          ? "Update product inventory, price, SKU, and threshold"
          : "Add a new consumable or retail product to your catalog"
      }
      icon={
        isEdit ? (
          <Edit3 className="w-4 h-4 text-[#7455A4]" />
        ) : (
          <Plus className="w-4 h-4 text-[#7455A4]" />
        )
      }
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 border border-[#EAE4F2] rounded-xl text-sm font-medium text-[#33283D] bg-white hover:bg-[#FAF8FC] transition-colors cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting && <Spinner className="w-4 h-4" />}
            <span>{isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}</span>
          </button>
        </div>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Product Name" required error={fieldErrors.name?.[0]}>
          <input
            type="text"
            required
            maxLength={255}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass("name")}
            placeholder="e.g. Argan Massage Oil (500ml)"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="SKU / Barcode" error={fieldErrors.sku?.[0]}>
            <input
              type="text"
              maxLength={100}
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className={inputClass("sku")}
              placeholder="e.g. OIL-ARG-500"
            />
          </FormField>

          <FormField label="Unit of Measure" error={fieldErrors.unit?.[0]}>
            <input
              type="text"
              maxLength={30}
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className={inputClass("unit")}
              placeholder="e.g. unit, ml, g, bottle"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Unit Price (MAD)" required error={fieldErrors.price?.[0]}>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className={inputClass("price")}
              placeholder="0.00"
            />
          </FormField>

          <FormField label="Current Stock" required error={fieldErrors.stock_quantity?.[0]}>
            <input
              type="number"
              required
              min={0}
              step={1}
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              className={inputClass("stock_quantity")}
              placeholder="0"
            />
          </FormField>

          <FormField label="Low Stock Alert" required error={fieldErrors.low_stock_threshold?.[0]}>
            <input
              type="number"
              required
              min={0}
              step={1}
              value={formData.low_stock_threshold}
              onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
              className={inputClass("low_stock_threshold")}
              placeholder="5"
            />
          </FormField>
        </div>

        <FormField label="Description" error={fieldErrors.description?.[0]}>
          <textarea
            rows={3}
            maxLength={2000}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-[#EAE4F2] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] bg-white text-[#33283D] placeholder-[#7A6F86]/60 transition-colors resize-none"
            placeholder="Usage instructions, ingredients, notes..."
          />
        </FormField>

        <div className="pt-2 border-t border-[#FAF8FC]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded-md border-[#C9B8E2] text-[#7455A4] focus:ring-[#7455A4]/20 cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-[#33283D] block">
                Active Product
              </span>
              <span className="text-xs text-[#7A6F86] block">
                Active products are selectable during reservations.
              </span>
            </div>
          </label>
        </div>
      </form>
    </SlideOver>
  );
}

