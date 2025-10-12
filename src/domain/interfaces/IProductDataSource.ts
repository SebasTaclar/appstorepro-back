import { Product } from '../entities/Product';

export interface IProductDataSource {
  getAll(query?: unknown): Promise<Product[]>;
  getById(id: number): Promise<Product | null>;
  getByCategory(categoryId: number): Promise<Product[]>;
  getShowcaseProducts(): Promise<Product[]>;
  create(product: Product): Promise<Product>;
  update(id: number, product: Partial<Product>): Promise<Product | null>;
  delete(id: number): Promise<boolean>;
}
