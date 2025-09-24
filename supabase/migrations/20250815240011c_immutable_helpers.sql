-- 11c: helper wrappers
CREATE OR REPLACE FUNCTION public.immutable_array_to_string(text[], text) 
RETURNS text AS $$
BEGIN
  RETURN array_to_string($1, $2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.immutable_to_tsvector(regconfig, text) 
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector($1, $2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.arr_to_tsv(anyarray)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT to_tsvector('simple', COALESCE(array_to_string($1, ' '), ''));
$$;