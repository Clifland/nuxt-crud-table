import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
}).refine(data => data.password === data.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

export default defineEventHandler(async (event) => {
  const { name, email, password } = await readValidatedBody(event, registerSchema.parse)

  const hashedPassword = await hashPassword(password)

  const user = await db.insert(schema.users).values({ name, email, password: hashedPassword }).returning().get()

  await setUserSession(event, { user, loggedInAt: new Date() })

  return { user }
})
