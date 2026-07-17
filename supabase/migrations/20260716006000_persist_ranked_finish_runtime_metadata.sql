-- Published ranked-finish pools dispatch from their immutable template version,
-- rather than from the mutable active setup-template registry.

update public.template_versions
set config = config || jsonb_build_object(
  'runtime', 'ranked-finish',
  'sport', 'motorsport',
  'rankedFinish', jsonb_build_object(
    'eventNoun', 'race weekend',
    'competitorNoun', 'driver',
    'lockLabel', 'before qualifying'
  )
)
where slug = 'f1-grand-prix-predictor'
  and version = 1;

update public.template_versions
set config = config || jsonb_build_object(
  'runtime', 'ranked-finish',
  'sport', 'golf',
  'rankedFinish', jsonb_build_object(
    'eventNoun', 'tournament',
    'competitorNoun', 'golfer',
    'lockLabel', 'before the first tee time'
  )
)
where slug = 'golf-pga-top-five-predictor'
  and version = 1;
