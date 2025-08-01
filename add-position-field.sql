-- Adicionar campo position na tabela notes para ordenação personalizada
ALTER TABLE public.notes ADD COLUMN position INTEGER DEFAULT 0;

-- Criar índice para melhor performance na ordenação
CREATE INDEX idx_notes_position ON public.notes(position);

-- Atualizar posições existentes baseado na ordem atual (pinned + updated_at)
UPDATE public.notes 
SET position = subquery.rn
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, COALESCE(folder, '') 
      ORDER BY is_pinned DESC, updated_at DESC
    ) as rn
  FROM public.notes
) subquery
WHERE public.notes.id = subquery.id; 