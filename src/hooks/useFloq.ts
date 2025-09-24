import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFloq(id: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("floqs")
        .select("*")
        .eq("id", id)
        .single();
        
      if (!error && active) {
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