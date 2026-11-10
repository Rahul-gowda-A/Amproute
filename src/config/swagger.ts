import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AmpRoute EV Charging Planner API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for EV charging station discovery, route planning with charger corridor detours, and concurrent charger reservations.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  components: {
    schemas: {
      Coordinates: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number', minimum: -90, maximum: 90, example: 12.9716 },
          longitude: { type: 'number', minimum: -180, maximum: 180, example: 77.5946 },
        },
      },
      ReservationResponse: {
        type: 'object',
        properties: {
          chargerId: { type: 'string', format: 'uuid', example: 'ccb6c52b-b620-4706-9beb-7811174d3033' },
          userId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
          status: { type: 'string', example: 'reserved' },
        },
      },
      RouteCharger: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          stationId: { type: 'string', format: 'uuid' },
          stationName: { type: 'string', example: 'GreenCharge484' },
          address: { type: 'string', example: '87 West Avenue, Bengaluru' },
          plugType: { type: 'string', example: 'CCS2' },
          maxPowerKw: { type: 'number', example: 150 },
          status: { type: 'string', example: 'available' },
          pricePerKwh: { type: 'number', example: 18.5 },
          location: { $ref: '#/components/schemas/Coordinates' },
          detourDistanceMeters: { type: 'number', example: 154.11 },
          distanceFromOriginMeters: { type: 'number', example: 906.85 },
        },
      },
      RoutePlanResponse: {
        type: 'object',
        properties: {
          route: {
            type: 'object',
            properties: {
              origin: { $ref: '#/components/schemas/Coordinates' },
              destination: { $ref: '#/components/schemas/Coordinates' },
              distanceMeters: { type: 'number', example: 7200 },
              distanceKm: { type: 'number', example: 7.2 },
              trajectory: {
                type: 'array',
                items: {
                  type: 'array',
                  items: { type: 'number' },
                },
                example: [
                  [77.5946, 12.9716],
                  [77.65, 13.0],
                ],
              },
            },
          },
          maxDetourMeters: { type: 'number', example: 5000 },
          totalChargers: { type: 'integer', example: 5 },
          chargers: {
            type: 'array',
            items: { $ref: '#/components/schemas/RouteCharger' },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Invalid parameters' },
          issues: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/routes/*.js', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

