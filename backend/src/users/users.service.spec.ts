import { UsersService } from './users.service.js';

function makePrismaMock() {
  const upsert = vi.fn(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({
    id: 'user-id',
    email: args.create.email,
    phone: args.create.phone,
    roles: ['USER'],
    status: 'ACTIVE',
  }));
  return { user: { upsert } };
}

describe('UsersService.syncFromSupabase', () => {
  it('normalizes an empty-string phone to null instead of writing "" (regression)', async () => {
    const prisma = makePrismaMock();
    const service = new UsersService(prisma as never);

    const result = await service.syncFromSupabase({ id: 'user-id', email: 'a@test.com', phone: '' });

    expect(result.phone).toBeNull();
    const call = prisma.user.upsert.mock.calls[0][0];
    expect(call.create.phone).toBeNull();
    expect(call.update.phone).toBeUndefined(); // undefined means "don't touch this field" in a Prisma update
  });

  it('normalizes an empty-string email to null the same way', async () => {
    const prisma = makePrismaMock();
    const service = new UsersService(prisma as never);

    const result = await service.syncFromSupabase({ id: 'user-id', email: '', phone: '+221770000000' });

    expect(result.email).toBeNull();
  });

  it('passes through a real phone/email unchanged', async () => {
    const prisma = makePrismaMock();
    const service = new UsersService(prisma as never);

    const result = await service.syncFromSupabase({ id: 'user-id', email: 'real@test.com', phone: '+221770000000' });

    expect(result.email).toBe('real@test.com');
    expect(result.phone).toBe('+221770000000');
  });

  it('derives the initial display name from the email local-part, falling back to phone', async () => {
    const prisma = makePrismaMock();
    const service = new UsersService(prisma as never);

    await service.syncFromSupabase({ id: 'user-id', email: 'jane.doe@test.com', phone: '' });
    let call = prisma.user.upsert.mock.calls.at(-1)![0];
    expect((call.create.profile as { create: { displayName: string } }).create.displayName).toBe('jane.doe');

    await service.syncFromSupabase({ id: 'user-2', email: '', phone: '+221770000000' });
    call = prisma.user.upsert.mock.calls.at(-1)![0];
    expect((call.create.profile as { create: { displayName: string } }).create.displayName).toBe('+221770000000');
  });
});
