import { z } from 'zod';

export const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

export const latitudeSchema = z.coerce
  .number({ invalid_type_error: 'Latitude must be a valid number' })
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

export const longitudeSchema = z.coerce
  .number({ invalid_type_error: 'Longitude must be a valid number' })
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

export const positiveRadiusSchema = z.coerce
  .number({ invalid_type_error: 'Radius must be a valid number' })
  .positive('Radius must be a positive number');

// Schema for /api/chargers/nearby
export const nearbyChargersQuerySchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
  radius: positiveRadiusSchema,
});

// Schema for /api/stations/nearby
export const nearbyStationsQuerySchema = z.object({
  lat: latitudeSchema.default(12.9716),
  lng: longitudeSchema.default(77.5946),
  radius_km: positiveRadiusSchema.default(10),
});

// Schema for reservation actions (/reserve and /release)
export const chargerParamsSchema = z.object({
  id: uuidSchema,
});

export const reservationBodySchema = z.object({
  userId: uuidSchema,
  chargerId: uuidSchema.optional(),
});

// Flexible schema for /api/routes/plan
export const planRouteSchema = z
  .object({
    originLat: latitudeSchema.optional(),
    originLng: longitudeSchema.optional(),
    destLat: latitudeSchema.optional(),
    destLng: longitudeSchema.optional(),
    origin: z
      .object({
        latitude: latitudeSchema.optional(),
        lat: latitudeSchema.optional(),
        longitude: longitudeSchema.optional(),
        lng: longitudeSchema.optional(),
      })
      .optional(),
    destination: z
      .object({
        latitude: latitudeSchema.optional(),
        lat: latitudeSchema.optional(),
        longitude: longitudeSchema.optional(),
        lng: longitudeSchema.optional(),
      })
      .optional(),
    maxDetourMeters: positiveRadiusSchema.default(5000),
    currentBatteryPct: z.number().min(0).max(100).optional(),
    batteryCapacityKwh: z.number().positive().optional(),
    maxRangeKm: z.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    const originLat = data.originLat ?? data.origin?.latitude ?? data.origin?.lat;
    const originLng = data.originLng ?? data.origin?.longitude ?? data.origin?.lng;
    const destLat = data.destLat ?? data.destination?.latitude ?? data.destination?.lat;
    const destLng = data.destLng ?? data.destination?.longitude ?? data.destination?.lng;

    if (originLat === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Origin latitude (originLat or origin.latitude) is required',
        path: ['originLat'],
      });
    }
    if (originLng === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Origin longitude (originLng or origin.longitude) is required',
        path: ['originLng'],
      });
    }
    if (destLat === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Destination latitude (destLat or destination.latitude) is required',
        path: ['destLat'],
      });
    }
    if (destLng === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Destination longitude (destLng or destination.longitude) is required',
        path: ['destLng'],
      });
    }
  })
  .transform((data) => {
    const originLat = (data.originLat ?? data.origin?.latitude ?? data.origin?.lat)!;
    const originLng = (data.originLng ?? data.origin?.longitude ?? data.origin?.lng)!;
    const destLat = (data.destLat ?? data.destination?.latitude ?? data.destination?.lat)!;
    const destLng = (data.destLng ?? data.destination?.longitude ?? data.destination?.lng)!;

    return {
      originLat,
      originLng,
      destLat,
      destLng,
      maxDetourMeters: data.maxDetourMeters,
      currentBatteryPct: data.currentBatteryPct,
      batteryCapacityKwh: data.batteryCapacityKwh,
      maxRangeKm: data.maxRangeKm,
    };
  });

export type PlanRouteInput = z.infer<typeof planRouteSchema>;

