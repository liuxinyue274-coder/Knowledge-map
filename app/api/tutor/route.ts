import { NextResponse } from "next/server";

import { createTutorBrief } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const node = body.node;

    if (!node?.id || !node?.data?.label) {
      return NextResponse.json({ error: "缺少知识点节点" }, { status: 400 });
    }

    const result = await createTutorBrief(node);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "无法生成复习串讲" }, { status: 500 });
  }
}
