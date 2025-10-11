import { Category } from '../entities/Category';

export interface ICategoryDataSource {
  getAll(query?: unknown): Promise<Category[]>;
  getById(id: number): Promise<Category | null>;
  getByName(name: string): Promise<Category | null>;
  create(category: Category): Promise<Category>;
  update(id: number, category: Partial<Category>): Promise<Category | null>;
  delete(id: number): Promise<boolean>;
}
