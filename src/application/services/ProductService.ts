import { Logger } from '../../shared/Logger';
import { ValidationError, NotFoundError } from '../../shared/exceptions';
import { IProductDataSource } from '../../domain/interfaces/IProductDataSource';
import { ICategoryDataSource } from '../../domain/interfaces/ICategoryDataSource';
import { Product } from '../../domain/entities/Product';

// Función utilitaria para normalizar colores
function normalizeColors(colors: string[]): string[] {
  return colors.map(
    (color) =>
      color
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes y acentos
  );
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  categoryId: number;
  status?: 'available' | 'out-of-stock' | 'coming-soon';
  colors?: string[];
  isShowcase?: boolean;
  showcaseImage?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  images?: string[];
  categoryId?: number;
  status?: 'available' | 'out-of-stock' | 'coming-soon';
  colors?: string[];
  isShowcase?: boolean;
  showcaseImage?: string;
}

export class ProductService {
  private logger: Logger;
  private productDataSource: IProductDataSource;
  private categoryDataSource: ICategoryDataSource;

  constructor(
    logger: Logger,
    productDataSource: IProductDataSource,
    categoryDataSource: ICategoryDataSource
  ) {
    this.logger = logger;
    this.productDataSource = productDataSource;
    this.categoryDataSource = categoryDataSource;
  }

  async getAllProducts(query?: unknown): Promise<Product[]> {
    this.logger.logInfo('Getting all products');

    try {
      const products = await this.productDataSource.getAll(query);
      this.logger.logInfo(`Retrieved ${products.length} products`);
      return products;
    } catch (error) {
      this.logger.logError('Error getting products', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product> {
    this.logger.logInfo(`Getting product by id: ${id}`);

    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    const productId = parseInt(id);
    if (isNaN(productId)) {
      throw new ValidationError('Product ID must be a valid number');
    }

    try {
      const product = await this.productDataSource.getById(productId);

      if (!product) {
        this.logger.logWarning(`Product not found with id: ${id}`);
        throw new NotFoundError('Product not found');
      }

      this.logger.logInfo(`Retrieved product: ${product.name}`);
      return product;
    } catch (error) {
      this.logger.logError(`Error getting product by id: ${id}`, error);
      throw error;
    }
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    this.logger.logInfo(`Getting products by category id: ${categoryId}`);

    if (!categoryId) {
      throw new ValidationError('Category ID is required');
    }

    const catId = parseInt(categoryId);
    if (isNaN(catId)) {
      throw new ValidationError('Category ID must be a valid number');
    }

    try {
      // Verificar que la categoría existe
      const category = await this.categoryDataSource.getById(catId);
      if (!category) {
        this.logger.logWarning(`Category not found with id: ${categoryId}`);
        throw new NotFoundError('Category not found');
      }

      const products = await this.productDataSource.getByCategory(catId);
      this.logger.logInfo(`Retrieved ${products.length} products for category: ${category.name}`);
      return products;
    } catch (error) {
      this.logger.logError(`Error getting products by category id: ${categoryId}`, error);
      throw error;
    }
  }

  async getShowcaseProducts(): Promise<Product[]> {
    this.logger.logInfo('Getting showcase products');

    try {
      const products = await this.productDataSource.getShowcaseProducts();
      this.logger.logInfo(`Retrieved ${products.length} showcase products`);
      return products;
    } catch (error) {
      this.logger.logError('Error getting showcase products', error);
      throw error;
    }
  }

  async createProduct(createRequest: CreateProductRequest): Promise<Product> {
    this.logger.logInfo(`Creating product: ${createRequest.name}`);

    // Validaciones básicas
    if (
      !createRequest.name ||
      !createRequest.description ||
      !createRequest.price ||
      !createRequest.categoryId
    ) {
      throw new ValidationError('Name, description, price, and categoryId are required');
    }

    if (!createRequest.images || createRequest.images.length === 0) {
      throw new ValidationError('At least one image is required');
    }

    if (createRequest.price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    if (createRequest.originalPrice && createRequest.originalPrice <= 0) {
      throw new ValidationError('Original price must be greater than 0');
    }

    // Verificar que la categoría existe
    try {
      const category = await this.categoryDataSource.getById(createRequest.categoryId);
      if (!category) {
        this.logger.logWarning(
          `Product creation failed: category not found with id ${createRequest.categoryId}`
        );
        throw new ValidationError('Category not found');
      }

      const productData: Product = {
        id: 0, // Will be generated by Prisma
        name: createRequest.name,
        description: createRequest.description,
        price: createRequest.price,
        originalPrice: createRequest.originalPrice,
        images: createRequest.images,
        categoryId: createRequest.categoryId,
        status: createRequest.status || 'available',
        colors: createRequest.colors ? normalizeColors(createRequest.colors) : undefined,
        isShowcase: createRequest.isShowcase || false,
        showcaseImage: createRequest.showcaseImage,
      };

      const newProduct = await this.productDataSource.create(productData);
      this.logger.logInfo(
        `Product created successfully: ${newProduct.name} (ID: ${newProduct.id})`
      );

      return newProduct;
    } catch (error) {
      this.logger.logError(`Error creating product: ${createRequest.name}`, error);
      throw error;
    }
  }

  async updateProduct(id: string, updateRequest: UpdateProductRequest): Promise<Product> {
    this.logger.logInfo(`Updating product with id: ${id}`);

    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    const productId = parseInt(id);
    if (isNaN(productId)) {
      throw new ValidationError('Product ID must be a valid number');
    }

    // Verificar que hay al menos un campo para actualizar
    const hasUpdates = Object.keys(updateRequest).length > 0;
    if (!hasUpdates) {
      throw new ValidationError('At least one field must be provided for update');
    }

    // Validaciones de campos específicos
    if (updateRequest.price !== undefined && updateRequest.price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    if (updateRequest.originalPrice !== undefined && updateRequest.originalPrice <= 0) {
      throw new ValidationError('Original price must be greater than 0');
    }

    if (updateRequest.images && updateRequest.images.length === 0) {
      throw new ValidationError('At least one image is required');
    }

    try {
      // Verificar que el producto existe
      const existingProduct = await this.productDataSource.getById(productId);
      if (!existingProduct) {
        this.logger.logWarning(`Product update failed: product not found with id ${id}`);
        throw new NotFoundError('Product not found');
      }

      // Si se está actualizando la categoría, verificar que existe
      if (updateRequest.categoryId) {
        const category = await this.categoryDataSource.getById(updateRequest.categoryId);
        if (!category) {
          this.logger.logWarning(
            `Product update failed: category not found with id ${updateRequest.categoryId}`
          );
          throw new ValidationError('Category not found');
        }
      }

      // Normalizar colores si se están actualizando
      const normalizedUpdateRequest = { ...updateRequest };
      if (updateRequest.colors) {
        normalizedUpdateRequest.colors = normalizeColors(updateRequest.colors);
      }

      const updatedProduct = await this.productDataSource.update(
        productId,
        normalizedUpdateRequest
      );

      if (!updatedProduct) {
        this.logger.logError(`Product update failed: product not found with id ${id}`);
        throw new NotFoundError('Product not found');
      }

      this.logger.logInfo(`Product updated successfully: ${updatedProduct.name} (ID: ${id})`);
      return updatedProduct;
    } catch (error) {
      this.logger.logError(`Error updating product with id: ${id}`, error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    this.logger.logInfo(`Deleting product with id: ${id}`);

    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    const productId = parseInt(id);
    if (isNaN(productId)) {
      throw new ValidationError('Product ID must be a valid number');
    }

    try {
      const deleted = await this.productDataSource.delete(productId);

      if (!deleted) {
        this.logger.logWarning(`Product deletion failed: product not found with id ${id}`);
        throw new NotFoundError('Product not found');
      }

      this.logger.logInfo(`Product deleted successfully with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.logError(`Error deleting product with id: ${id}`, error);
      throw error;
    }
  }
}
