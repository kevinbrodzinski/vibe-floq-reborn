import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useHQDigest(id: string, since?: string) {
  const [data, setData] = useState<{
    summary: any;
    last_digest_at: string;
    receipt: any;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.functions.invoke("hq-digest", {
        body: { floq_id: id, since }
      });
      setData(data);
    })();
  }, [id, since]);

  return data;
}