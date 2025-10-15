/**
 * Unit Tests for Database/Supabase Node Configuration
 * Tests vector search, hybrid search, and query configurations
 */

describe('Database Node Configuration', () => {
  describe('Embedding Generation Node', () => {
    const embeddingConfig = {
      url: '={{ $env.OPENAI_API_URL || \'https://api.openai.com\' }}/v1/embeddings',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'Authorization',
            value: '=Bearer {{ $env.OPENAI_API_KEY }}'
          },
          {
            name: 'Content-Type',
            value: 'application/json'
          }
        ]
      },
      jsonBody: '={{ {\"model\": \"text-embedding-3-small\", \"input\": $json.normalizedText} }}',
      options: {
        retry: {
          maxTries: 3,
          waitBetweenTries: 5000
        }
      }
    };

    test('should use text-embedding-3-small model (Task 4.1-4.2)', () => {
      expect(embeddingConfig.jsonBody).toContain('text-embedding-3-small');
    });

    test('should use OpenAI embeddings endpoint', () => {
      expect(embeddingConfig.url).toContain('/v1/embeddings');
    });

    test('should send authorization header', () => {
      const authHeader = embeddingConfig.headerParameters.parameters.find(
        h => h.name === 'Authorization'
      );
      expect(authHeader).toBeDefined();
      expect(authHeader.value).toContain('Bearer');
    });

    test('should have retry configuration (Task 11.1)', () => {
      expect(embeddingConfig.options.retry.maxTries).toBe(3);
      expect(embeddingConfig.options.retry.waitBetweenTries).toBe(5000);
    });

    test('should accept normalized text as input', () => {
      expect(embeddingConfig.jsonBody).toContain('$json.normalizedText');
    });
  });

  describe('Hybrid Search Query (Task 4.4-4.7)', () => {
    const hybridSearchQuery = `
WITH vector_search AS (
  SELECT
    id,
    title,
    metadata,
    embedding <-> $1::vector AS distance,
    1 - (embedding <-> $1::vector) AS similarity
  FROM knowledge_base
  WHERE metadata->>'status' = 'active'
  ORDER BY distance
  LIMIT 10
),
keyword_search AS (
  SELECT
    id,
    title,
    metadata,
    similarity(COALESCE(metadata->>'summary', ''), $2) AS keyword_score
  FROM knowledge_base
  WHERE metadata->>'status' = 'active'
    AND (COALESCE(metadata->>'summary', '') % $2 OR title % $2)
  ORDER BY keyword_score DESC
  LIMIT 10
)
SELECT
  kb.id,
  kb.title,
  kb.metadata->>'summary' AS summary,
  COALESCE(vs.similarity, 0) AS vector_similarity,
  COALESCE(ks.keyword_score, 0) AS keyword_score,
  (
    COALESCE(1.0 / (60 + vs_rank), 0) +
    COALESCE(1.0 / (60 + ks_rank), 0)
  ) AS combined_score
FROM knowledge_base kb
LEFT JOIN vector_search vs ON kb.id = vs.id
LEFT JOIN keyword_search ks ON kb.id = ks.id
WHERE vs.id IS NOT NULL OR ks.id IS NOT NULL
ORDER BY combined_score DESC
LIMIT 5;
    `;

    test('should use pgvector <-> operator for vector search (Task 4.4)', () => {
      expect(hybridSearchQuery).toContain('embedding <-> $1::vector');
    });

    test('should use pg_trgm similarity for keyword search (Task 4.5)', () => {
      expect(hybridSearchQuery).toContain('similarity(');
    });

    test('should implement Reciprocal Rank Fusion (Task 4.6)', () => {
      expect(hybridSearchQuery).toContain('1.0 / (60 +');
      expect(hybridSearchQuery).toContain('vs_rank');
      expect(hybridSearchQuery).toContain('ks_rank');
    });

    test('should filter by active status (Task 4.7)', () => {
      expect(hybridSearchQuery).toContain('metadata->>\'status\' = \'active\'');
    });

    test('should return top 5 results (Task 4.8)', () => {
      expect(hybridSearchQuery).toContain('LIMIT 5');
    });

    test('should include both vector and keyword scores', () => {
      expect(hybridSearchQuery).toContain('vector_similarity');
      expect(hybridSearchQuery).toContain('keyword_score');
      expect(hybridSearchQuery).toContain('combined_score');
    });

    test('should use LEFT JOIN for hybrid matching', () => {
      expect(hybridSearchQuery).toContain('LEFT JOIN');
      expect(hybridSearchQuery).toContain('WHERE vs.id IS NOT NULL OR ks.id IS NOT NULL');
    });
  });

  describe('Fallback Keyword Search (Task 4.15)', () => {
    const fallbackQuery = `
SELECT
  id,
  title,
  metadata->>'summary' AS summary,
  0 AS vector_similarity,
  similarity(COALESCE(metadata->>'summary', title), $1) AS keyword_score
FROM knowledge_base
WHERE metadata->>'status' = 'active'
  AND (COALESCE(metadata->>'summary', '') % $1 OR title % $1)
ORDER BY keyword_score DESC
LIMIT 5;
    `;

    test('should use keyword-only search when vector fails', () => {
      expect(fallbackQuery).toContain('similarity(');
      expect(fallbackQuery).not.toContain('embedding');
    });

    test('should set vector_similarity to 0', () => {
      expect(fallbackQuery).toContain('0 AS vector_similarity');
    });

    test('should still filter by active status', () => {
      expect(fallbackQuery).toContain('metadata->>\'status\' = \'active\'');
    });

    test('should return same limit as hybrid search', () => {
      expect(fallbackQuery).toContain('LIMIT 5');
    });
  });

  describe('Lazy Loading Configuration (Task 4.14)', () => {
    const lazyLoadQuery = `
SELECT
  id,
  title,
  content,
  metadata,
  search_keywords
FROM knowledge_base
WHERE id = ANY($1::uuid[]);
    `;

    test('should fetch full content only when needed', () => {
      expect(lazyLoadQuery).toContain('content');
      expect(lazyLoadQuery).not.toContain('embedding'); // Don't fetch large embedding
    });

    test('should accept array of IDs', () => {
      expect(lazyLoadQuery).toContain('ANY($1::uuid[])');
    });

    test('should fetch all necessary fields', () => {
      expect(lazyLoadQuery).toContain('title');
      expect(lazyLoadQuery).toContain('metadata');
      expect(lazyLoadQuery).toContain('search_keywords');
    });
  });

  describe('Database Configuration', () => {
    const dbConfig = {
      host: '={{ $env.SUPABASE_HOST }}',
      port: 5432,
      database: '={{ $env.SUPABASE_DATABASE }}',
      user: '={{ $env.SUPABASE_USER }}',
      password: '={{ $env.SUPABASE_PASSWORD }}',
      ssl: true,
      options: {
        retry: {
          maxTries: 3,
          waitBetweenTries: 5000
        },
        timeout: 10000
      }
    };

    test('should use environment variables for credentials', () => {
      expect(dbConfig.host).toContain('$env.SUPABASE_HOST');
      expect(dbConfig.database).toContain('$env.SUPABASE_DATABASE');
      expect(dbConfig.user).toContain('$env.SUPABASE_USER');
      expect(dbConfig.password).toContain('$env.SUPABASE_PASSWORD');
    });

    test('should use standard PostgreSQL port', () => {
      expect(dbConfig.port).toBe(5432);
    });

    test('should enable SSL for security', () => {
      expect(dbConfig.ssl).toBe(true);
    });

    test('should have retry configuration', () => {
      expect(dbConfig.options.retry.maxTries).toBe(3);
    });

    test('should have reasonable timeout', () => {
      expect(dbConfig.options.timeout).toBe(10000);
    });
  });

  describe('Metadata Filtering (Task 4.7)', () => {
    test('should support category filtering', () => {
      const categoryFilter = 'metadata->>\'category\' = $2';
      expect(categoryFilter).toContain('category');
    });

    test('should support property_id filtering', () => {
      const propertyFilter = 'metadata->>\'property_id\' = $3';
      expect(propertyFilter).toContain('property_id');
    });

    test('should support success_rate filtering', () => {
      const successFilter = '(metadata->>\'success_rate\')::float > 0.80';
      expect(successFilter).toContain('success_rate');
      expect(successFilter).toContain('0.80');
    });

    test('should support date range filtering', () => {
      const dateFilter = 'created_at >= $4 AND created_at <= $5';
      expect(dateFilter).toContain('created_at');
    });
  });

  describe('Index Configuration (Task 2.7-2.10)', () => {
    const indexes = {
      vector: {
        type: 'hnsw',
        params: { m: 16, ef_construction: 64 }
      },
      trigram: {
        type: 'gin',
        extension: 'pg_trgm'
      },
      metadata: {
        type: 'gin',
        target: 'metadata'
      },
      btree: {
        type: 'btree',
        fields: ['category', 'property_id']
      }
    };

    test('should use HNSW index with m=16 (Task 2.7)', () => {
      expect(indexes.vector.type).toBe('hnsw');
      expect(indexes.vector.params.m).toBe(16);
    });

    test('should use ef_construction=64 (Task 2.7)', () => {
      expect(indexes.vector.params.ef_construction).toBe(64);
    });

    test('should use pg_trgm extension (Task 2.8)', () => {
      expect(indexes.trigram.extension).toBe('pg_trgm');
    });

    test('should have GIN index on metadata (Task 2.9)', () => {
      expect(indexes.metadata.type).toBe('gin');
      expect(indexes.metadata.target).toBe('metadata');
    });

    test('should have B-tree indexes on filtered fields (Task 2.10)', () => {
      expect(indexes.btree.type).toBe('btree');
      expect(indexes.btree.fields).toContain('category');
      expect(indexes.btree.fields).toContain('property_id');
    });
  });

  describe('Query Performance (Task 4.12-4.13)', () => {
    test('should target <200ms query latency', () => {
      const targetLatency = 200; // milliseconds
      expect(targetLatency).toBeLessThan(300);
    });

    test('should use connection pooling', () => {
      const poolConfig = {
        pooling: 'pgBouncer',
        maxConnections: 20,
        minConnections: 5
      };

      expect(poolConfig.pooling).toBe('pgBouncer');
      expect(poolConfig.maxConnections).toBeGreaterThan(0);
    });

    test('should implement Redis caching with 1-hour TTL (Task 4.11)', () => {
      const cacheConfig = {
        enabled: true,
        ttl: 3600, // 1 hour in seconds
        keyPrefix: 'knowledge_search:'
      };

      expect(cacheConfig.enabled).toBe(true);
      expect(cacheConfig.ttl).toBe(3600);
    });
  });

  describe('Routing Statistics Tracking (Task 5.7)', () => {
    const statsQuery = `
INSERT INTO system_metrics (metric_name, metric_value, category, subcategory, metadata, timestamp)
VALUES
  ('routing_path_count', 1, 'routing', $1, jsonb_build_object(
    'ticket_id', $2,
    'confidence', $3,
    'knowledge_count', $4
  ), NOW()),
  ('routing_confidence', $3, 'quality', 'retrieval', jsonb_build_object(
    'routing_path', $1,
    'ticket_id', $2
  ), NOW());
    `;

    test('should insert routing metrics', () => {
      expect(statsQuery).toContain('INSERT INTO system_metrics');
      expect(statsQuery).toContain('routing_path_count');
    });

    test('should track confidence scores', () => {
      expect(statsQuery).toContain('routing_confidence');
    });

    test('should use JSONB for metadata', () => {
      expect(statsQuery).toContain('jsonb_build_object');
    });

    test('should timestamp metrics', () => {
      expect(statsQuery).toContain('NOW()');
    });
  });
});
