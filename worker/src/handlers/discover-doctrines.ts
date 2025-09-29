import { Env } from '../embedding/openai-client';
import { hierarchicalClustering, enrichClustersWithKeywords, generateDoctrineNames } from '../clustering/doctrine-discovery';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface DiscoverDoctrinesRequest {
  minSimilarity?: number;
  minClusterSize?: number;
  maxClusters?: number;
  filter?: {
    type?: 'judicial' | 'statute';
    court?: string;
    legal_domain?: string;
  };
}

export async function discoverDoctrines(
  request: Request,
  env: Env & { VECTORIZE: any; DB: D1Database },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: DiscoverDoctrinesRequest = await request.json();
    const {
      minSimilarity = 0.70,
      minClusterSize = 5,
      maxClusters = 20,
      filter = {}
    } = body;

    console.log('[Discover Doctrines] Starting emergent doctrine discovery...');
    console.log('[Discover Doctrines] Parameters:', { minSimilarity, minClusterSize, maxClusters, filter });

    console.log('[Discover Doctrines] Step 1: Fetching judicial decision vectors...');

    const filterType = filter.type || 'judicial';
    const allVectors: any[] = [];
    const batchSize = 50;
    const maxVectors = 500;

    for (let batch = 0; batch < 10; batch++) {
      const randomVector = new Array(1536).fill(0).map(() => (Math.random() - 0.5) * 0.01);

      const batchQuery = await env.VECTORIZE.query(
        randomVector,
        {
          topK: batchSize,
          returnMetadata: true,
          returnValues: true
        }
      );

      if (batchQuery.matches.length === 0) {
        break;
      }

      const newVectors = batchQuery.matches
        .filter((m: any) => m.metadata?.type === filterType)
        .filter((m: any) => !allVectors.some((existing: any) => existing.id === m.id));

      allVectors.push(...newVectors);

      console.log(`[Discover Doctrines] Batch ${batch + 1}: ${newVectors.length} new vectors (total: ${allVectors.length})`);

      if (allVectors.length >= maxVectors) {
        break;
      }
    }

    console.log(`[Discover Doctrines] Retrieved ${allVectors.length} decision vectors`);

    if (allVectors.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No vectors found matching filter criteria',
          filter
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vectors = allVectors.map((m: any) => ({
      id: m.id,
      score: m.score || 0,
      vector: m.values,
      metadata: m.metadata
    }));

    console.log('[Discover Doctrines] Step 2: Clustering decisions by semantic similarity...');
    const startTime = Date.now();

    let clusters = hierarchicalClustering(vectors, minSimilarity, minClusterSize);

    const clusteringTime = Date.now() - startTime;
    console.log(`[Discover Doctrines] Clustering completed in ${clusteringTime}ms`);

    if (clusters.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No clusters found with given parameters. Try lowering minSimilarity or minClusterSize.',
          parameters: { minSimilarity, minClusterSize }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    clusters = clusters.slice(0, maxClusters);

    console.log('[Discover Doctrines] Step 3: Processing clusters (statute anchoring optional)...');

    const allClusters: any[] = [];

    for (const cluster of clusters) {
      allClusters.push({
        decisions: cluster.members,
        decision_count: cluster.members.length,
        avg_similarity: cluster.avgWeight,
        civil_code_section: null,
        civil_code_text: null,
        anchor_similarity: null
      });

      console.log(`[Discover Doctrines] Cluster with ${cluster.members.length} decisions (avg similarity: ${cluster.avgWeight.toFixed(3)})`);
    }

    allClusters.sort((a, b) => b.decision_count - a.decision_count);
    const topClusters = allClusters.slice(0, maxClusters);

    console.log(`[Discover Doctrines] Selected ${topClusters.length} largest clusters`);

    console.log('[Discover Doctrines] Generating doctrine names with AI...');
    const doctrineNames = await generateDoctrineNames(
      topClusters.map(c => ({
        id: 0,
        members: c.decisions,
        centroid: [],
        keywords: [],
        avgWeight: c.avg_similarity
      })),
      env
    );

    console.log('[Discover Doctrines] Storing doctrines in database with incremental updates...');

    const storedDoctrines: any[] = [];
    let newDoctrines = 0;
    let updatedDoctrines = 0;

    for (let i = 0; i < topClusters.length; i++) {
      const cluster = topClusters[i];
      const nameData = doctrineNames[i];

      const existing = await env.DB.prepare(`
        SELECT id, discovered_at FROM doctrines WHERE name = ?
      `).bind(nameData.name).first();

      let doctrineId: number;

      if (existing) {
        doctrineId = existing.id as number;
        updatedDoctrines++;

        await env.DB.prepare(`
          UPDATE doctrines
          SET display_name = ?,
              description = ?,
              keywords = ?,
              member_count = ?,
              avg_confidence = ?,
              legal_domain = ?,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          nameData.displayName,
          nameData.description,
          JSON.stringify([]),
          cluster.decision_count,
          cluster.avg_similarity,
          filter.legal_domain || 'civil_law',
          doctrineId
        ).run();

        await env.DB.prepare(`
          DELETE FROM decision_doctrines WHERE doctrine_id = ?
        `).bind(doctrineId).run();

        console.log(`[Discover Doctrines] Updated existing doctrine: "${nameData.displayName}" (ID: ${doctrineId})`);
      } else {
        newDoctrines++;

        const result = await env.DB.prepare(`
          INSERT INTO doctrines (name, display_name, description, keywords, member_count, avg_confidence, legal_domain)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          nameData.name,
          nameData.displayName,
          nameData.description,
          JSON.stringify([]),
          cluster.decision_count,
          cluster.avg_similarity,
          filter.legal_domain || 'civil_law'
        ).run();

        doctrineId = result.meta.last_row_id;

        console.log(`[Discover Doctrines] Created new doctrine: "${nameData.displayName}" (ID: ${doctrineId})`);
      }

      for (const decision of cluster.decisions) {
        const caseId = decision.metadata.case_id;
        if (caseId) {
          await env.DB.prepare(`
            INSERT OR IGNORE INTO decision_doctrines (decision_id, doctrine_id, confidence)
            VALUES (?, ?, ?)
          `).bind(caseId, doctrineId, 1.0).run();
        }
      }

      storedDoctrines.push({
        id: doctrineId,
        name: nameData.name,
        displayName: nameData.displayName,
        description: nameData.description,
        civil_code_section: cluster.civil_code_section || 'unanchored',
        anchor_similarity: cluster.anchor_similarity ? cluster.anchor_similarity.toFixed(3) : 'N/A',
        memberCount: cluster.decision_count,
        avgSimilarity: cluster.avg_similarity.toFixed(3),
        isNew: !existing,
        sampleCases: cluster.decisions.slice(0, 3).map((m: any) => ({
          case_id: m.metadata.case_id,
          text_preview: m.metadata.text.substring(0, 200)
        }))
      });
    }

    console.log(`[Discover Doctrines] Successfully stored ${storedDoctrines.length} doctrines (${newDoctrines} new, ${updatedDoctrines} updated)`);

    return new Response(
      JSON.stringify({
        success: true,
        doctrines: storedDoctrines,
        statistics: {
          decisions_analyzed: allVectors.length,
          clusters_found: clusters.length,
          anchored_clusters: topClusters.length,
          clustering_time_ms: clusteringTime,
          new_doctrines: newDoctrines,
          updated_doctrines: updatedDoctrines,
          parameters: { minSimilarity, minClusterSize, maxClusters }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[Discover Doctrines] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}