import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useHQVibes(id: string) {
  const [data, setData] = useState<{
    per_member: any[];
    consensus: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    (async () => {
      setLoading(true);
      const { data } = await supabase.functions.invoke("hq-vibes", {
        body: { floq_id: id }
      });
      
      if (active) {
        setData(data);
        setLoading(false);
      }
    })();
    
    return () => {
      active = false;
    };
  }, [id]);

  return { data, loading };
}