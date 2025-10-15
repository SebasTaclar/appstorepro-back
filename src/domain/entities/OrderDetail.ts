export interface OrderDetail {
  id: number;
  purchaseId: number;
  productName: string; // Nombre del producto (desnormalizado)
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedColor?: string;
}
