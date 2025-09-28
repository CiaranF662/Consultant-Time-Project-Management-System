import { z } from 'zod';

// #region User Schemas
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['GROWTH_TEAM', 'CONSULTANT']).default('CONSULTANT')
});

export const updateUserSchema = createUserSchema.partial();
// #endregion

// #region Project Schemas
export const createProjectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  budgetedHours: z.number().min(0, 'Budget must be positive'),
  productManagerId: z.string().uuid().optional()
});

export const updateProjectSchema = createProjectSchema.partial();
// #endregion

// #region Phase Schemas
export const createPhaseSchema = z.object({
  name: z.string().min(2, 'Phase name required'),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  projectId: z.string().uuid()
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate']
});
// #endregion

// #region Allocation Schemas
export const createAllocationSchema = z.object({
  phaseId: z.string().uuid(),
  consultantId: z.string().uuid(),
  totalHours: z.number().min(0.5, 'Minimum 0.5 hours required'),
  consultantDescription: z.string().optional()
});
// #endregion