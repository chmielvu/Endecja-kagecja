import { z } from 'zod';

// --- Temporal Schemas ---
export const TemporalFactSchema = z.union([
  z.object({
    type: z.literal('instant'),
    timestamp: z.string(),
    confidence: z.number().optional()
  }),
  z.object({
    type: z.literal('interval'),
    start: z.string(),
    end: z.string(),
    confidence: z.number().optional()
  }),
  z.object({
    type: z.literal('fuzzy'),
    approximate: z.string(),
    uncertainty: z.number().optional(),
    confidence: z.number().optional()
  })
]);

// --- Source Citation Schema ---
export const SourceCitationSchema = z.object({
  uri: z.string(),
  label: z.string().optional(),
  page: z.string().optional(),
  type: z.enum(['primary', 'secondary', 'archival', 'memoir', 'report', 'website', 'book']).optional(),
  retrievedAt: z.number().optional()
});

// --- Region Info Schema ---
export const RegionInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
  country: z.string().optional(),
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  type: z.enum(['city', 'province', 'country', 'geopolitical_entity', 'historical_region']).optional()
});

// --- Existence Schema ---
export const ExistenceSchema = z.object({
  start: z.string(),
  end: z.string().optional(),
  status: z.enum(['active', 'latent', 'defunct', 'reformed', 'formed', 'dissolved', 'established']),
  context: z.string().optional(),
  confidence: z.number().optional()
});

// --- Role Schema ---
export const RoleSchema = z.object({
  role: z.string(),
  organization: z.string().optional(),
  event: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  context: z.string().optional(),
  confidence: z.number().optional()
});

// --- Node Data Schema ---
export const NodeDataSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['person', 'organization', 'event', 'concept', 'publication', 'document', 'location']),
  description: z.string().optional(),
  validity: TemporalFactSchema.optional(),
  existence: z.array(ExistenceSchema).optional(),
  roles: z.array(RoleSchema).optional(),
  importance: z.number().optional(),
  region: RegionInfoSchema.optional(),
  parent: z.string().optional(),
  
  // Metrics
  degreeCentrality: z.number().optional(),
  pagerank: z.number().optional(),
  community: z.number().optional(),
  louvainCommunity: z.number().optional(),
  kCore: z.number().optional(),
  betweenness: z.number().optional(),
  closeness: z.number().optional(),
  eigenvector: z.number().optional(),
  clustering: z.number().optional(),

  networkHealth: z.object({
    efficiency: z.number(),
    safety: z.number(),
    balance: z.number(),
    vulnerabilityScore: z.number(),
    identifiedIssues: z.array(z.string())
  }).optional(),
  
  embedding: z.array(z.number()).optional(),
  sources: z.array(SourceCitationSchema).optional(),
  certainty: z.enum(['confirmed', 'disputed', 'alleged', 'hypothesized']).optional(),
  confidenceScore: z.number().optional()
});

// --- Edge Data Schema ---
export const EdgeDataSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relationType: z.enum([
    'founded', 'member_of', 'led', 'published', 'influenced', 
    'opposed', 'collaborated_with', 'participated_in', 'created', 'destroyed', 
    'related_to', 'supported', 'criticized', 'authored', 'organized'
  ]),
  label: z.string().optional(),
  temporal: TemporalFactSchema.optional(),
  weight: z.number().optional(),
  sign: z.enum(['positive', 'negative', 'neutral']).optional(),
  isBalanced: z.boolean().optional(),
  sources: z.array(SourceCitationSchema).optional(),
  certainty: z.enum(['confirmed', 'disputed', 'alleged', 'hypothesized']).optional(),
  confidenceScore: z.number().optional(),
  visibility: z.enum(['public', 'clandestine', 'private', 'restricted']).optional()
});

export const GraphPatchSchema = z.object({
  type: z.enum(['expansion', 'deepening', 'document_ingestion']),
  reasoning: z.string(),
  nodes: z.array(NodeDataSchema.partial()), // Partial because patches might update existing nodes
  edges: z.array(EdgeDataSchema.partial())
});
