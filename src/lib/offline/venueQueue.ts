type Job =
  | { t:'join'; id:string }
  | { t:'save'; id:string }
  | { t:'plan'; id:string }
  | { t:'checkin'; id:string, lat?:number, lng?:number };

const LS = 'floq:offline:venue:v1';

function load(): Job[] { 
  try { 
    return JSON.parse(localStorage.getItem(LS) || '[]'); 
  } catch { 
    return []; 
  } 
}

function save(q: Job[]) { 
  try { 
    localStorage.setItem(LS, JSON.stringify(q)); 
  } catch {} 
}

let queue = load();

export function enqueue(job: Job) { 
  queue.push(job); 
  save(queue); 
}

export function drain(run: (job: Job) => Promise<void>) {
  const now = [...queue]; 
  queue = []; 
  save(queue);
  return now.reduce(async (p, job) => { 
    await p; 
    try { 
      await run(job); 
    } catch { 
      enqueue(job); 
    } 
  }, Promise.resolve());
}

export function isOnline() { 
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false; 
}