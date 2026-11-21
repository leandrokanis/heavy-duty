import { z } from '@hono/zod-openapi'

export const MuscleGroupSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000001' }),
    slug: z.string().openapi({ example: 'triceps' }),
    name: z.string().openapi({ example: 'tríceps' }),
    position: z.number().int().openapi({ example: 6 }),
  })
  .openapi('MuscleGroup')

export const MuscleGroupListSchema = z
  .object({ muscleGroups: z.array(MuscleGroupSchema) })
  .openapi('MuscleGroupList')

export type MuscleGroup = z.infer<typeof MuscleGroupSchema>

export const MuscleSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000101' }),
    slug: z.string().openapi({ example: 'triceps-braquial' }),
    name: z.string().openapi({ example: 'tríceps braquial' }),
    muscleGroup: MuscleGroupSchema.pick({ id: true, slug: true, name: true }),
  })
  .openapi('Muscle')

export const MuscleListSchema = z.object({ muscles: z.array(MuscleSchema) }).openapi('MuscleList')

// Fields are optional so the service, not the schema, refuses a missing value
// with the same domain error on HTTP and MCP.
export const AddMuscleInputSchema = z
  .object({
    name: z.string().optional().openapi({ example: 'tríceps braquial' }),
    muscleGroupSlug: z.string().optional().openapi({ example: 'triceps' }),
  })
  .openapi('AddMuscleInput')

export type Muscle = z.infer<typeof MuscleSchema>
export type AddMuscleInput = z.infer<typeof AddMuscleInputSchema>

export const ExerciseKindSchema = z.enum(['reps', 'time']).openapi('ExerciseKind')

export const ExerciseMuscleSchema = MuscleSchema.extend({
  role: z.enum(['primary', 'secondary']).openapi({ example: 'secondary' }),
}).openapi('ExerciseMuscle')

export const ExerciseSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000201' }),
    slug: z.string().openapi({ example: 'supino-reto' }),
    name: z.string().openapi({ example: 'Supino reto' }),
    kind: ExerciseKindSchema,
    muscles: z.array(ExerciseMuscleSchema),
    muscleGroups: z.array(MuscleGroupSchema.pick({ id: true, slug: true, name: true })),
  })
  .openapi('Exercise')

export const ExerciseListSchema = z
  .object({ exercises: z.array(ExerciseSchema) })
  .openapi('ExerciseList')

// Same as AddMuscleInputSchema: the service refuses missing or invalid values,
// so kind stays a free string here.
export const AddExerciseInputSchema = z
  .object({
    name: z.string().optional().openapi({ example: 'Supino reto' }),
    kind: z.string().optional().openapi({ example: 'reps' }),
    primaryMuscleSlugs: z
      .array(z.string())
      .optional()
      .openapi({ example: ['peitoral-maior'] }),
    secondaryMuscleSlugs: z
      .array(z.string())
      .optional()
      .openapi({ example: ['triceps-braquial'] }),
  })
  .openapi('AddExerciseInput')

export type ExerciseKind = z.infer<typeof ExerciseKindSchema>
export type ExerciseMuscle = z.infer<typeof ExerciseMuscleSchema>
export type Exercise = z.infer<typeof ExerciseSchema>
export type AddExerciseInput = z.infer<typeof AddExerciseInputSchema>
