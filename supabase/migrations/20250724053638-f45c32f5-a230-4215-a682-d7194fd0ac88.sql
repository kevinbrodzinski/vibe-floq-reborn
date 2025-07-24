-- Update ensure_floq_links to use floq_participants consistently
UPDATE public.ensure_floq_links SET function_definition = replace(function_definition, 'floq_members', 'floq_participants')
WHERE function_name = 'ensure_floq_links';