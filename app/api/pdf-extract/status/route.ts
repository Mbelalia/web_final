import { NextRequest, NextResponse } from "next/server";
import { jobQueue } from "@/lib/jobQueue";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const userId = searchParams.get('userId');
  
  if (jobId) {
    const job = jobQueue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  }
  
  if (userId) {
    const jobs = jobQueue.getUserJobs(userId);
    return NextResponse.json({ jobs });
  }
  
  return NextResponse.json({ error: 'Missing jobId or userId' }, { status: 400 });
}