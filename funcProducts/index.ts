import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getProductService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { AuthenticatedUser } from '../src/shared/authMiddleware';
import { validateAuthToken } from '../src/shared/authHelper';

const funcProducts = async (_context: Context, req: HttpRequest, log: Logger): Promise<unknown> => {
  const productService = getProductService(log);
  const method = req.method?.toUpperCase();
  const productId = req.params?.id;

  // Si es GET, no requiere autenticación
  if (method === 'GET') {
    log.logInfo(`Processing ${method} request for products (public)`, { productId });

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
  }

  // Para métodos que no sean GET, requiere autenticación
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    log.logError('Authentication failed: Missing authorization header');
    return ApiResponseBuilder.error('Unauthorized: Missing authorization header', 401);
  }

  try {
    // Validar y extraer el token
    const token = validateAuthToken(authHeader);

    // Verificar el token y extraer la información del usuario
    const { verifyToken } = await import('../src/shared/jwtHelper');
    const userPayload = verifyToken(token);

    const user: AuthenticatedUser = {
      id: userPayload.id,
      email: userPayload.email,
      name: userPayload.name,
      role: userPayload.role,
      membershipPaid: userPayload.membershipPaid,
    };

    log.logInfo(`User authenticated successfully: ${user.email}`);

    log.logInfo(`Processing ${method} request for products (authenticated)`, {
      productId,
      userId: user.id,
    });

    switch (method) {
      case 'POST': {
        // POST /v1/products - Crear nuevo producto
        if (productId) {
          return ApiResponseBuilder.validationError([
            'ID should not be provided when creating a product',
          ]);
        }
        const newProduct = await productService.createProduct(req.body);
        return ApiResponseBuilder.success(newProduct, 'Product created successfully');
      }

      case 'PUT': {
        // PUT /v1/products/{id} - Actualizar producto
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    log.logError(`Authentication failed: ${errorMessage}`);

    if (
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('invalid token')
    ) {
      return ApiResponseBuilder.error('Unauthorized: Invalid or expired token', 401);
    }

    return ApiResponseBuilder.error(`Error: ${errorMessage}`, 500);
  }
};

export default withApiHandler(funcProducts);
