import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { base } from "../__core/app";
import { auth, OWNER_EMAIL } from "../auth";
import { db } from "../database";
import { profiles, settings, recordings, user } from "../database/schema";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
const authed = base.use(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session)
    throw new ORPCError("UNAUTHORIZED", { message: "Entre para continuar." });
  const isAdmin =
    session.user.email.toLowerCase() === OWNER_EMAIL &&
    session.user.emailVerified;
  await db
    .insert(profiles)
    .values({ userId: session.user.id })
    .onConflictDoNothing();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id));
  const active =
    isAdmin ||
    (profile.status === "active" && (profile.expiresAt ?? 0) > Date.now());
  return next({ context: { user: session.user, isAdmin, profile, active } });
});
const admin = authed.use(({ context, next }) => {
  if (!context.isAdmin) throw new ORPCError("FORBIDDEN");
  return next();
});
const active = authed.use(({ context, next }) => {
  if (!context.active)
    throw new ORPCError("FORBIDDEN", {
      message: "Sua bancada precisa ser ativada pelo administrador.",
    });
  return next();
});
async function plan() {
  await db.insert(settings).values({ id: "plan" }).onConflictDoNothing();
  const [p] = await db.select().from(settings).where(eq(settings.id, "plan"));
  return p;
}
export const vision = {
  password: authed
    .input(
      z.object({
        newPassword: z.string().min(8).max(128),
        currentPassword: z.string().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      if (input.currentPassword)
        await auth.api.changePassword({
          headers: context.headers,
          body: {
            currentPassword: input.currentPassword,
            newPassword: input.newPassword,
            revokeOtherSessions: true,
          },
        });
      else
        await auth.api.setPassword({
          headers: context.headers,
          body: { newPassword: input.newPassword },
        });
      return { ok: true };
    }),
  me: authed.handler(({ context }) => ({
    user: context.user,
    isAdmin: context.isAdmin,
    active: context.active,
    profile: context.profile,
  })),
  plan: base.handler(plan),
  reportPayment: authed.handler(async ({ context }) => {
    await db
      .update(profiles)
      .set({ paymentReported: true })
      .where(eq(profiles.userId, context.user.id));
    return { ok: true };
  }),
  list: authed.handler(({ context }) =>
    db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.ownerId, context.user.id),
          eq(recordings.status, "ready"),
        ),
      )
      .orderBy(desc(recordings.createdAt)),
  ),
  members: admin.handler(async () => {
    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        status: profiles.status,
        expiresAt: profiles.expiresAt,
        paymentReported: profiles.paymentReported,
      })
      .from(user)
      .leftJoin(profiles, eq(user.id, profiles.userId));
  }),
  activate: admin
    .input(
      z.object({
        userId: z.string(),
        activate: z.boolean(),
        days: z.number().int().min(1).max(365),
      }),
    )
    .handler(async ({ input }) => {
      const values = {
        status: input.activate ? "active" : "blocked",
        expiresAt: input.activate ? Date.now() + input.days * 86400000 : null,
        paymentReported: false,
      };
      await db
        .insert(profiles)
        .values({ userId: input.userId, ...values })
        .onConflictDoUpdate({ target: profiles.userId, set: values });
      return { ok: true };
    }),
  savePlan: admin
    .input(
      z.object({
        pixKey: z.string().max(200),
        pixName: z.string().max(150),
        price: z.number().int().min(1).max(10000),
        days: z.number().int().min(1).max(365),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .insert(settings)
        .values({ id: "plan", ...input })
        .onConflictDoUpdate({ target: settings.id, set: input });
      return { ok: true };
    }),
  prepare: active
    .input(
      z.object({
        customer: z.string().min(1).max(120),
        device: z.string().min(1).max(120),
        service: z.string().min(1).max(300),
        duration: z.number().int().min(0),
        size: z
          .number()
          .int()
          .min(1)
          .max(2 * 1024 * 1024 * 1024),
        contentType: z.enum(["video/webm", "video/mp4"]),
      }),
    )
    .handler(async ({ input, context }) => {
      const id = crypto.randomUUID();
      const token =
        crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
      const key = `recordings/${context.user.id}/${id}.${input.contentType === "video/mp4" ? "mp4" : "webm"}`;
      await db
        .insert(recordings)
        .values({
          id,
          ownerId: context.user.id,
          customer: input.customer,
          device: input.device,
          service: input.service,
          duration: input.duration,
          size: input.size,
          token,
          key,
          createdAt: Date.now(),
        });
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ContentType: input.contentType,
        }),
        { expiresIn: 3600 },
      );
      return { id, url };
    }),
  finish: active
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [r] = await db
        .select()
        .from(recordings)
        .where(
          and(
            eq(recordings.id, input.id),
            eq(recordings.ownerId, context.user.id),
          ),
        );
      if (!r) throw new ORPCError("NOT_FOUND");
      const object = await s3.send(
        new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: r.key }),
      );
      if (object.ContentLength !== r.size)
        throw new ORPCError("BAD_REQUEST", {
          message: "Upload incompleto. Tente novamente.",
        });
      await db
        .update(recordings)
        .set({ status: "ready" })
        .where(eq(recordings.id, r.id));
      return { token: r.token };
    }),
  watch: base
    .input(z.object({ token: z.string().min(30).max(100) }))
    .handler(async ({ input }) => {
      const [r] = await db
        .select()
        .from(recordings)
        .where(
          and(
            eq(recordings.token, input.token),
            eq(recordings.status, "ready"),
          ),
        );
      if (!r)
        throw new ORPCError("NOT_FOUND", {
          message: "Este vídeo não foi encontrado.",
        });
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: r.key }),
        { expiresIn: 3600 },
      );
      await db
        .update(recordings)
        .set({ views: sql`${recordings.views} + 1` })
        .where(eq(recordings.id, r.id));
      return {
        device: r.device,
        service: r.service,
        duration: r.duration,
        createdAt: r.createdAt,
        url,
      };
    }),
};
