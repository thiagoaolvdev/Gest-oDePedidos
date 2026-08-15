const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chemarauto Veículos - API',
      version: '1.0.0',
      description: 'API para gerenciamento de pedidos de peças'
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 3000}/api`, description: 'Desenvolvimento' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = [swaggerUi.serve, swaggerUi.setup(swaggerSpec)];
