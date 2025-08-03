import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { corsHeaders, respondWithCors } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

interface SchedulerJob {
  id: string;
  type: 'venue_sync' | 'venue_intelligence' | 'venue_cleanup' | 'popularity_update';
  priority: number;
  location?: { lat: number; lng: number; radius?: number };
  venue_ids?: string[];
  metadata?: any;
  scheduled_at: Date;
  attempts: number;
  max_attempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface SchedulerRequest {
  action: 'run_jobs' | 'schedule_job' | 'get_status' | 'cleanup_old_jobs';
  job_types?: string[];
  location?: { lat: number; lng: number; radius?: number };
  force?: boolean;
}

interface JobResult {
  job_id: string;
  success: boolean;
  duration_ms: number;
  result?: any;
  error?: string;
}

const JOB_PRIORITIES = {
  venue_sync: 1,
  venue_intelligence: 2,
  popularity_update: 3,
  venue_cleanup: 4
};

const JOB_INTERVALS = {
  venue_sync: 6 * 60 * 60 * 1000, // 6 hours
  venue_intelligence: 24 * 60 * 60 * 1000, // 24 hours
  popularity_update: 2 * 60 * 60 * 1000, // 2 hours
  venue_cleanup: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Get pending jobs from database
async function getPendingJobs(jobTypes?: string[]): Promise<SchedulerJob[]> {
  let query = supabase
    .from('venue_scheduler_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('scheduled_at', { ascending: true });

  if (jobTypes && jobTypes.length > 0) {
    query = query.in('type', jobTypes);
  }

  const { data, error } = await query.limit(50);
  
  if (error) throw error;
  
  return (data || []).map(job => ({
    ...job,
    scheduled_at: new Date(job.scheduled_at)
  }));
}

// Update job status
async function updateJobStatus(
  jobId: string, 
  status: SchedulerJob['status'], 
  result?: any, 
  error?: string
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (result) updateData.result = result;
  if (error) updateData.error = error;
  if (status === 'running') updateData.started_at = new Date().toISOString();
  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('venue_scheduler_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (updateError) {
    console.error(`[Scheduler] Failed to update job ${jobId}:`, updateError);
  }
}

// Execute venue sync job
async function executeVenueSync(job: SchedulerJob): Promise<any> {
  const { location, venue_ids } = job;
  
  if (location) {
    const { lat, lng, radius = 2000 } = location;
    
    const response = await supabase.functions.invoke('automated-venue-sync', {
      body: {
        lat,
        lng,
        radius,
        sources: ['google', 'foursquare'],
        force_refresh: false
      }
    });

    if (response.error) throw response.error;
    return response.data;
  }
  
  throw new Error("Venue sync job requires location data");
}

// Execute venue intelligence job
async function executeVenueIntelligence(job: SchedulerJob): Promise<any> {
  const { location, venue_ids } = job;
  
  const requestBody: any = {};
  
  if (venue_ids && venue_ids.length > 0) {
    requestBody.venue_ids = venue_ids;
  } else if (location) {
    requestBody.location = location;
  } else {
    // Process all venues (limited batch)
    requestBody.update_all = false;
    
    // Get venues that haven't been processed recently
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .or('updated_at.is.null,updated_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);
      
    if (venues && venues.length > 0) {
      requestBody.venue_ids = venues.map(v => v.id);
    }
  }

  const response = await supabase.functions.invoke('venue-intelligence', {
    body: requestBody
  });

  if (response.error) throw response.error;
  return response.data;
}

// Execute popularity update job
async function executePopularityUpdate(job: SchedulerJob): Promise<any> {
  // Update venue popularity based on recent activity
  const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  
  const { data: venueActivity, error } = await supabase
    .from('venue_live_presence')
    .select('venue_id, COUNT(*) as visit_count, AVG(live_count) as avg_crowd')
    .gte('created_at', cutoffTime.toISOString())
    .group('venue_id');

  if (error) throw error;

  if (venueActivity && venueActivity.length > 0) {
    // Update venue popularity scores
    const updates = venueActivity.map(activity => ({
      id: activity.venue_id,
      popularity: Math.min(100, Math.round(
        (activity.visit_count * 2) + (activity.avg_crowd * 5)
      )),
      updated_at: new Date().toISOString()
    }));

    const { error: updateError } = await supabase
      .from('venues')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) throw updateError;

    return {
      updated_venues: updates.length,
      average_popularity: updates.reduce((sum, u) => sum + u.popularity, 0) / updates.length
    };
  }

  return { updated_venues: 0 };
}

// Execute venue cleanup job
async function executeVenueCleanup(job: SchedulerJob): Promise<any> {
  const results = {
    deleted_venues: 0,
    archived_venues: 0,
    cleaned_errors: 0
  };

  // Delete venues with no activity and old timestamp
  const oldVenuesCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  
  const { data: oldVenues, error: oldVenuesError } = await supabase
    .from('venues')
    .select('id')
    .lt('created_at', oldVenuesCutoff.toISOString())
    .eq('live_count', 0)
    .eq('popularity', 0)
    .limit(100);

  if (oldVenuesError) throw oldVenuesError;

  if (oldVenues && oldVenues.length > 0) {
    // Check if these venues have any recent activity
    const { data: recentActivity } = await supabase
      .from('venue_live_presence')
      .select('venue_id')
      .in('venue_id', oldVenues.map(v => v.id))
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (!recentActivity || recentActivity.length === 0) {
      // Safe to delete venues with no recent activity
      const { error: deleteError } = await supabase
        .from('venues')
        .delete()
        .in('id', oldVenues.map(v => v.id));

      if (deleteError) throw deleteError;
      results.deleted_venues = oldVenues.length;
    }
  }

  // Clean up old sync errors
  const errorsCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const { error: cleanupError } = await supabase
    .from('venues_sync_errors')
    .delete()
    .lt('created_at', errorsCutoff.toISOString());

  if (cleanupError) throw cleanupError;

  // Clean up old sync logs
  const { data: deletedLogs } = await supabase
    .from('sync_log')
    .delete()
    .lt('created_at', errorsCutoff.toISOString());

  results.cleaned_errors = deletedLogs?.length || 0;

  return results;
}

// Execute a single job
async function executeJob(job: SchedulerJob): Promise<JobResult> {
  const startTime = Date.now();
  
  try {
    await updateJobStatus(job.id, 'running');
    
    let result: any;
    
    switch (job.type) {
      case 'venue_sync':
        result = await executeVenueSync(job);
        break;
      case 'venue_intelligence':
        result = await executeVenueIntelligence(job);
        break;
      case 'popularity_update':
        result = await executePopularityUpdate(job);
        break;
      case 'venue_cleanup':
        result = await executeVenueCleanup(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    
    await updateJobStatus(job.id, 'completed', result);
    
    return {
      job_id: job.id,
      success: true,
      duration_ms: Date.now() - startTime,
      result
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateJobStatus(job.id, 'failed', null, errorMessage);
    
    return {
      job_id: job.id,
      success: false,
      duration_ms: Date.now() - startTime,
      error: errorMessage
    };
  }
}

// Schedule a new job
async function scheduleJob(
  type: SchedulerJob['type'],
  scheduledAt: Date,
  options: {
    location?: { lat: number; lng: number; radius?: number };
    venue_ids?: string[];
    metadata?: any;
    priority?: number;
  } = {}
): Promise<string> {
  const job = {
    id: crypto.randomUUID(),
    type,
    priority: options.priority || JOB_PRIORITIES[type] || 5,
    location: options.location,
    venue_ids: options.venue_ids,
    metadata: options.metadata,
    scheduled_at: scheduledAt.toISOString(),
    attempts: 0,
    max_attempts: 3,
    status: 'pending' as const,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('venue_scheduler_jobs')
    .insert(job);

  if (error) throw error;
  
  return job.id;
}

// Auto-schedule recurring jobs
async function autoScheduleJobs(): Promise<string[]> {
  const scheduledJobs: string[] = [];
  
  // Check what jobs need to be scheduled
  for (const [jobType, interval] of Object.entries(JOB_INTERVALS)) {
    const cutoff = new Date(Date.now() - interval);
    
    // Check if this job type has been run recently
    const { data: recentJobs } = await supabase
      .from('venue_scheduler_jobs')
      .select('id')
      .eq('type', jobType)
      .eq('status', 'completed')
      .gte('completed_at', cutoff.toISOString())
      .limit(1);

    if (!recentJobs || recentJobs.length === 0) {
      // Schedule this job type
      const jobId = await scheduleJob(
        jobType as SchedulerJob['type'],
        new Date(Date.now() + Math.random() * 60 * 1000), // Random delay up to 1 minute
        {
          metadata: { auto_scheduled: true, interval }
        }
      );
      scheduledJobs.push(jobId);
    }
  }
  
  return scheduledJobs;
}

// Clean up old completed jobs
async function cleanupOldJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const { data: deletedJobs } = await supabase
    .from('venue_scheduler_jobs')
    .delete()
    .in('status', ['completed', 'failed'])
    .lt('completed_at', cutoff.toISOString());

  return deletedJobs?.length || 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: { ...corsHeaders, "Content-Length": "0" } 
    });
  }
  
  if (req.method !== "POST") {
    return respondWithCors({ error: "Method not allowed" }, 405);
  }

  try {
    const request: SchedulerRequest = await req.json();
    const { action, job_types, location, force = false } = request;

    switch (action) {
      case 'run_jobs': {
        console.log("[Scheduler] Running pending jobs...");
        
        // Auto-schedule recurring jobs if needed
        const autoScheduled = await autoScheduleJobs();
        if (autoScheduled.length > 0) {
          console.log(`[Scheduler] Auto-scheduled ${autoScheduled.length} jobs`);
        }
        
        // Get pending jobs
        const pendingJobs = await getPendingJobs(job_types);
        console.log(`[Scheduler] Found ${pendingJobs.length} pending jobs`);
        
        if (pendingJobs.length === 0) {
          return respondWithCors({
            ok: true,
            jobs_executed: 0,
            auto_scheduled: autoScheduled.length,
            message: "No pending jobs to execute"
          });
        }
        
        // Execute jobs in parallel (limited concurrency)
        const maxConcurrency = 3;
        const results: JobResult[] = [];
        
        for (let i = 0; i < pendingJobs.length; i += maxConcurrency) {
          const batch = pendingJobs.slice(i, i + maxConcurrency);
          const batchPromises = batch.map(job => executeJob(job));
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          
          // Small delay between batches
          if (i + maxConcurrency < pendingJobs.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`[Scheduler] Executed ${results.length} jobs: ${successful} successful, ${failed} failed`);
        
        return respondWithCors({
          ok: true,
          jobs_executed: results.length,
          successful,
          failed,
          auto_scheduled: autoScheduled.length,
          results
        });
      }
      
      case 'schedule_job': {
        if (!location) {
          throw new Error("Location is required for scheduling jobs");
        }
        
        const scheduledJobs: string[] = [];
        
        // Schedule venue sync job
        const syncJobId = await scheduleJob('venue_sync', new Date(), { location });
        scheduledJobs.push(syncJobId);
        
        // Schedule intelligence job (delayed)
        const intelligenceJobId = await scheduleJob(
          'venue_intelligence', 
          new Date(Date.now() + 5 * 60 * 1000), // 5 minutes later
          { location }
        );
        scheduledJobs.push(intelligenceJobId);
        
        return respondWithCors({
          ok: true,
          scheduled_jobs: scheduledJobs,
          location
        });
      }
      
      case 'get_status': {
        const { data: jobStats } = await supabase
          .from('venue_scheduler_jobs')
          .select('status, type, COUNT(*)')
          .group('status, type');
        
        const stats = {
          total_jobs: 0,
          by_status: {} as Record<string, number>,
          by_type: {} as Record<string, number>
        };
        
        if (jobStats) {
          jobStats.forEach((stat: any) => {
            const count = parseInt(stat.count);
            stats.total_jobs += count;
            stats.by_status[stat.status] = (stats.by_status[stat.status] || 0) + count;
            stats.by_type[stat.type] = (stats.by_type[stat.type] || 0) + count;
          });
        }
        
        return respondWithCors({
          ok: true,
          stats,
          job_intervals: JOB_INTERVALS
        });
      }
      
      case 'cleanup_old_jobs': {
        const deletedCount = await cleanupOldJobs();
        
        return respondWithCors({
          ok: true,
          deleted_jobs: deletedCount
        });
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.error("[Scheduler] Error:", error);
    return respondWithCors({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});