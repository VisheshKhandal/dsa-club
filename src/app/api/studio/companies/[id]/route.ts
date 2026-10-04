import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CompanyModel } from "@/features/content/models/content.model";
import { requireAdmin } from "@/lib/rbac";
import { NextResponse } from "next/server";

const linkSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url().max(2048),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  logo: z.string().max(2048).optional(),
  description: z.string().max(2000).optional(),
  interviewProcess: z.string().max(2000).optional(),
  hiringNotes: z.string().max(1000).optional(),
  tier: z.enum(["startup", "growth", "product", "big_tech"]).optional(),
  tags: z.array(z.string().max(40)).optional(),
  externalLinks: z.array(linkSchema).optional(),
  isPublished: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const company = await CompanyModel.findById(id).lean();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json({ company: { ...company, id: String(company._id) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    
    const company = await CompanyModel.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();
    
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json({ company: { ...company, id: String(company._id) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    await connectToDatabase();
    const { id } = await params;
    const company = await CompanyModel.findByIdAndDelete(id).lean();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: msg === "FORBIDDEN" ? 403 : 500 });
  }
}
