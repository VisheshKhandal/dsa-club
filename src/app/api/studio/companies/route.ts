import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CompanyModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const linkSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url().max(2048),
});

const companyBodySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  logo: z.string().max(2048).default(""),
  description: z.string().max(2000).default(""),
  interviewProcess: z.string().max(2000).default(""),
  hiringNotes: z.string().max(1000).default(""),
  tier: z.enum(["startup", "growth", "product", "big_tech"]),
  tags: z.array(z.string().max(40)).default([]),
  externalLinks: z.array(linkSchema).default([]),
  isPublished: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("q") ?? "";
    const tier = searchParams.get("tier") ?? "all";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }];
    if (tier !== "all") filter.tier = tier;
    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;

    const [rawCompanies, total] = await Promise.all([
      CompanyModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      CompanyModel.countDocuments(filter),
    ]);

    const companies = rawCompanies.map((c: any) => ({ ...c, id: String(c._id) }));

    return NextResponse.json({ companies, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const body = await req.json();
    const parsed = companyBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const company = await CompanyModel.create(parsed.data);
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("E11000")) return NextResponse.json({ error: "A company with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}
