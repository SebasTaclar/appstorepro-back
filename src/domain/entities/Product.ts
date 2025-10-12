export type Product = {
  id: number;
  name: string;
  description: string;
  price: number; // Decimal se convierte a number en TypeScript
  originalPrice?: number;
  images: string[]; // Array de URLs
  categoryId: number;
  status: 'available' | 'out-of-stock' | 'coming-soon';
  colors?: string[]; // Array de colores
  isShowcase: boolean;
  showcaseImage?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // Relación opcional para cuando se incluya la categoría
  category?: {
    id: number;
    name: string;
    description?: string;
  };
};
