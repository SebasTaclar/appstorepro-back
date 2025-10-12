export interface OrderDetail {
  id: number;
  purchaseId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedColor?: string;

  // Relaciones opcionales (cuando se incluyen en queries)
  product?: {
    id: number;
    name: string;
    description: string;
    images: string[];
    categoryId: number;
  };
}
