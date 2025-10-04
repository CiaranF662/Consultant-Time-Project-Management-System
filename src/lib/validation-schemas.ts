import { z } from 'zod';

/**
 * Zod validation schemas for API input validation
 * These schemas ensure type safety and data integrity across API routes
 */

// ========== Common Schemas ==========

// CUID format (Prisma default): starts with 'c' followed by 24 alphanumeric characters
export const idSchema = z.string().min(1, 'ID is required');

export const emailSchema = z.string().email({ message: 'Invalid email format' });

export const positiveIntSchema = z.number().int().positive({ message: 'Must be a positive integer' });

export const dateSchema = z.string().or(z.date());

// ========== Project Schemas ==========

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim(),
  description: z.string().optional(),
  startDate: dateSchema,
  durationInWeeks: z.number().int().positive('Duration must be a positive number'),
  consultantIds: z.array(idSchema).min(1, 'At least one consultant required'),
  productManagerId: idSchema,
  budgetedHours: positiveIntSchema,
  consultantAllocations: z.record(z.string(), positiveIntSchema).optional()
});

export const updateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim().optional(),
  description: z.string().optional().nullable(),
  budgetedHours: positiveIntSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start < end;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
);

// ========== Phase Schemas ==========

export const createPhaseSchema = z.object({
  name: z.string().min(1, 'Phase name is required').max(255, 'Name too long').trim(),
  description: z.string().optional(),
  sprintIds: z.array(idSchema).min(1, 'At least one sprint required')
});

export const updatePhaseSchema = z.object({
  name: z.string().min(1, 'Phase name is required').max(255, 'Name too long').trim().optional(),
  description: z.string().optional().nullable(),
  sprintIds: z.array(idSchema).min(1, 'At least one sprint required').optional()
});

// ========== Allocation Schemas ==========

export const createPhaseAllocationSchema = z.object({
  consultantId: idSchema,
  totalHours: positiveIntSchema
});

export const bulkUpdatePhaseAllocationsSchema = z.object({
  allocations: z.array(
    z.object({
      consultantId: idSchema,
      totalHours: z.number().positive('Hours must be positive')
    })
  ).min(1, 'At least one allocation required')
});

export const createWeeklyAllocationSchema = z.object({
  phaseAllocationId: idSchema,
  weekStartDate: dateSchema,
  weekEndDate: dateSchema,
  proposedHours: z.number().min(0, 'Hours cannot be negative'),
  weekNumber: z.number().int().min(1, 'Week number must be at least 1'),
  year: z.number().int().min(2000, 'Invalid year')
}).refine(
  (data) => {
    const start = new Date(data.weekStartDate);
    const end = new Date(data.weekEndDate);
    return start < end;
  },
  {
    message: 'Week end date must be after start date',
    path: ['weekEndDate']
  }
);

export const batchCreateWeeklyAllocationsSchema = z.object({
  allocations: z.array(createWeeklyAllocationSchema).min(1, 'At least one allocation required')
});

// ========== Hour Change Request Schemas ==========

export const createHourChangeRequestSchema = z.object({
  phaseAllocationId: idSchema,
  changeType: z.enum(['ADJUST_HOURS', 'TRANSFER_HOURS'], {
    message: 'Invalid change type'
  }),
  requestedHourChange: z.number().int(),
  targetConsultantId: idSchema.optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long')
}).refine(
  (data) => {
    // If transferring hours, target consultant is required
    if (data.changeType === 'TRANSFER_HOURS' && !data.targetConsultantId) {
      return false;
    }
    // If transferring, hours must be negative (taken from source)
    if (data.changeType === 'TRANSFER_HOURS' && data.requestedHourChange >= 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Invalid hour change request configuration',
    path: ['changeType']
  }
);

export const approveHourChangeRequestSchema = z.object({
  approvedHourChange: z.number().int().optional(),
  note: z.string().max(500, 'Note too long').optional()
});

export const rejectHourChangeRequestSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500, 'Reason too long')
});

// ========== Approval Schemas ==========

export const approvePhaseAllocationSchema = z.object({
  note: z.string().max(500, 'Note too long').optional()
});

export const rejectPhaseAllocationSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500, 'Reason too long')
});

export const approveWeeklyAllocationSchema = z.object({
  approvedHours: positiveIntSchema.optional(),
  note: z.string().max(500, 'Note too long').optional()
});

export const rejectWeeklyAllocationSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500, 'Reason too long')
});

// ========== User Schemas ==========

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['CONSULTANT', 'GROWTH_TEAM'], {
    message: 'Invalid role'
  })
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').trim().optional(),
  role: z.enum(['CONSULTANT', 'GROWTH_TEAM']).optional()
});

export const approveUserSchema = z.object({
  approved: z.boolean()
});

// ========== Validation Helper Functions ==========

/**
 * Validates request body against a Zod schema
 * Returns parsed data or throws a validation error
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws ZodError if validation fails
 */
export function validateRequestBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validates request body and returns result
 * Use this for handling validation errors manually
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Safe parse result with success flag and data/error
 */
export function safeValidateRequestBody<T extends z.ZodType>(
  schema: T,
  data: unknown
) {
  return schema.safeParse(data);
}

/**
 * Formats Zod validation errors for API response
 *
 * @param error - ZodError instance
 * @returns Formatted error object
 */
export function formatValidationErrors(error: z.ZodError) {
  return {
    error: 'Validation failed',
    details: error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}
