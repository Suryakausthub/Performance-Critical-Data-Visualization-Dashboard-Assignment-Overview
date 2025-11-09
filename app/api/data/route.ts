import { NextResponse } from "next/server";
import { generateInitialDataset } from "@/lib/dataGenerator";


export const dynamic = "force-dynamic";


export async function GET() {
const data = generateInitialDataset(10000); // seed last 10k points
return NextResponse.json(data);
}