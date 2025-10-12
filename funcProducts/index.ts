import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getProductService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { AuthenticatedUser } from '../src/shared/authMiddleware';

const funcProducts = async (
  _context: Context,
  req: HttpRequest,
  log: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const productService = getProductService(log);
  const method = req.method?.toUpperCase();
  const productId = req.params?.id;

  log.logInfo(`Processing ${method} request for products`, { productId, userId: user.id });

  switch (method) {
    case 'GET':
      if (productId) {
        // GET /v1/products/{id} - Obtener producto por ID
        const product = await productService.getProductById(productId);
        return ApiResponseBuilder.success(product, 'Product retrieved successfully');
      } else {
        // GET /v1/products - Obtener productos con filtros opcionales
        // Verificar si se solicitan productos de showcase
        if (req.query.showcase === 'true') {
          const showcaseProducts = await productService.getShowcaseProducts();
          return ApiResponseBuilder.success(
            {
              count: showcaseProducts.length,
              products: showcaseProducts,
            },
            'Showcase products retrieved successfully'
          );
        }

        // Verificar si se solicitan productos por categoría
        if (req.query.categoryId) {
          const categoryProducts = await productService.getProductsByCategory(req.query.categoryId);
          return ApiResponseBuilder.success(
            {
              count: categoryProducts.length,
              products: categoryProducts,
            },
            'Products by category retrieved successfully'
          );
        }

        // Obtener todos los productos con filtros
        const products = await productService.getAllProducts(req.query);
        return ApiResponseBuilder.success(
          {
            count: products.length,
            products: products,
          },
          'Products retrieved successfully'
        );
      }

    case 'POST': { // POST /v1/products - Crear nuevo producto
      if (productId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating a product',
        ]);
      }
      const newProduct = await productService.createProduct(req.body);
      return ApiResponseBuilder.success(newProduct, 'Product created successfully');
    }

    case 'PUT': // PUT /v1/products/{id} - Actualizar producto
    {
      if (!productId) {
        return ApiResponseBuilder.validationError(['Product ID is required for update']);
      }
      const updatedProduct = await productService.updateProduct(productId, req.body);
      return ApiResponseBuilder.success(updatedProduct, 'Product updated successfully');
    }

    case 'DELETE':
      // DELETE /v1/products/{id} - Eliminar producto
      if (!productId) {
        return ApiResponseBuilder.validationError(['Product ID is required for deletion']);
      }
      await productService.deleteProduct(productId);
      return ApiResponseBuilder.success(null, 'Product deleted successfully');

    default:
      return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
  }
};

export default withAuthenticatedApiHandler(funcProducts);
