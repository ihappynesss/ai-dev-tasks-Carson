# Product Requirements Document: NSW Strata Management Automation Workflow

## Introduction/Overview

This PRD defines the implementation of an intelligent n8n workflow system for automating NSW strata management ticket responses. The system will handle 100+ monthly support tickets from property owners and tenants, progressively learning from human expertise to achieve 70-80% automation rates. Starting with full human oversight, the workflow will evolve through three phases (Manual, Assisted, Autonomous) while maintaining strict quality controls and compliance with NSW strata regulations.

The solution combines Freshdesk ticket management, Perplexity AI research capabilities, Claude AI response generation, and a Supabase pgvector knowledge base with semantic search. This architecture enables intelligent ticket routing, knowledge retrieval, and automated response generation while ensuring accuracy through similarity-based decision thresholds.

## Goals

1. **Reduce average ticket response time by 50-70%** from current manual processing baseline
2. **Achieve 70-80% automation rate** for routine tickets after 100 training samples
3. **Maintain customer satisfaction scores above 4.5/5** through accurate, empathetic responses
4. **Build a progressively learning knowledge base** that improves with each validated ticket-response pair
5. **Ensure 100% compliance with NSW strata regulations** (SSMA 2015, SSDA 2015, and 2025 reforms)
6. **Reduce operational costs by 60%** through intelligent automation
7. **Enable 24/7 ticket processing** with immediate acknowledgment and routing
8. **Create comprehensive audit trail** for all automated decisions and responses

## User Stories

### Property Owner Stories
- As a property owner, I want to receive immediate acknowledgment of my maintenance request so that I know it's being addressed
- As a property owner, I want accurate information about by-laws and regulations so that I can comply with strata rules
- As a property owner, I want quick resolution to levy payment queries so that I can manage my finances effectively
- As a property owner, I want to submit renovation applications and receive clear guidance on the approval process

### Tenant Stories
- As a tenant, I want to report noise complaints and receive appropriate action steps so that my living conditions improve
- As a tenant, I want to understand my rights and responsibilities under NSW strata law so that I can be a good resident
- As a tenant, I want to report security issues and know they'll be addressed urgently

### Strata Manager Stories
- As a strata manager, I want AI to handle routine queries so that I can focus on complex issues requiring human expertise
- As a strata manager, I want to review and approve AI-generated responses before they reach customers during training phase
- As a strata manager, I want visibility into automation performance metrics so that I can optimize the system
- As a strata manager, I want the system to escalate critical issues immediately so that urgent matters aren't delayed

### System Administrator Stories
- As a system administrator, I want comprehensive error handling so that workflow failures don't impact customer service
- As a system administrator, I want monitoring dashboards so that I can track system health and performance
- As a system administrator, I want the ability to update knowledge base entries when regulations change

## Functional Requirements

### Core Workflow Engine
1. The system must receive and process Freshdesk webhooks for new tickets within 500ms
2. The system must authenticate all webhook requests using shared secret header validation
3. The system must enrich ticket data with complete details from Freshdesk API
4. The system must normalize and preprocess ticket text (remove HTML, extract entities)
5. The system must categorize tickets into 8 NSW strata categories with 85%+ accuracy
6. The system must maintain workflow state across executions using Supabase PostgreSQL

### Workflow Types
7. The system must implement distinct workflow types:
   - New Ticket Workflow: Full processing pipeline for incoming tickets
   - Reply Workflow: Handles updates and customer responses to existing tickets
   - Scheduled Maintenance Workflow: Hourly/nightly automated operations
   - Manual Trigger Workflow: On-demand processing with human review
   - Batch Processing Workflow: Bulk knowledge base updates for regulatory changes

### Knowledge Base and Retrieval
8. The system must pre-populate knowledge base with NSW strata regulations and common issues
9. The system must generate vector embeddings (1536 dimensions) using OpenAI text-embedding-3-small
10. The system must perform hybrid search combining vector similarity and keyword matching
11. The system must implement Reciprocal Rank Fusion: combined_score = sum(1/(60 + vector_rank)) + sum(1/(60 + keyword_rank))
12. The system must calculate cosine similarity scores for intelligent routing decisions
13. The system must filter knowledge by category, property, date range, and success rate (>80%)
14. The system must maintain versioning for all knowledge base entries
15. The system must configure HNSW indexes with m=16 (connections) and ef_construction=64 (quality)

### Progressive Learning System
16. The system must track learning progress through three phases: Manual (0-30), Assisted (30-100), Autonomous (100+)
17. The system must implement specific milestones:
    - 30 samples: Enable basic few-shot classification (40-50% accuracy)
    - 50 samples: Activate draft generation for similarity >0.60 (50% approval rate)
    - 75 samples: Achieve 70% classification accuracy with dynamic thresholds
    - 100 samples: Enter Autonomous Mode with 30-40% auto-response rate
18. The system must store all validated ticket-response pairs as training examples
19. The system must implement few-shot learning using 5 most similar historical examples
20. The system must calculate category-specific confidence thresholds dynamically
21. The system must maintain success rate metrics for each knowledge entry
22. The system must enable A/B testing with 20% experimental traffic for optimization

### Decision Engine and Routing
23. The system must implement 5 routing paths with exact similarity thresholds:
    - Path 1: Auto-Respond (similarity >0.85 AND training_samples >100 AND !requires_human_review)
    - Path 2: Auto-Refine (similarity 0.75-0.85 AND training_samples >100)
    - Path 3: Generate Draft (similarity 0.50-0.75 AND training_samples >30)
    - Path 4: Deep Research (similarity <0.50)
    - Path 5: Immediate Escalation (priority='Critical' OR complexity >4)
24. The system must perform Claude API quality checks: "Return 'APPROVED' or provide specific corrections"
25. The system must update Freshdesk tickets with responses and status changes (status=4 for Resolved)
26. The system must track routing statistics per path for monthly optimization
27. The system must implement Claude self-refine for Path 2: generate → critique → improve (3 iterations)

### AI Integration
28. The system must integrate with Claude API (claude-sonnet-4.5) for response generation
29. The system must integrate with Perplexity API using:
    - sonar-deep-research model (5 RPM rate limit) for comprehensive investigation
    - sonar-pro model (50 RPM) for faster queries
30. The system must handle API rate limits:
    - Exponential backoff starting at 5 seconds
    - Redis queue for Perplexity requests at 4.5 RPM max
    - Respect Retry-After headers
31. The system must implement Claude prompt caching:
    - Cache system prompts and NSW legislation (50K tokens)
    - Reduce costs by 90% for repeated context
32. The system must provide fallback hierarchy: Claude → GPT-4o → GPT-4o Mini
33. The system must batch OpenAI embeddings (50-100 documents) for 50% cost savings

### Conversation Management
34. The system must handle multi-turn conversations maintaining context in conversation_state table
35. The system must analyze sentiment changes: improved (close ticket) vs declined (escalate)
36. The system must escalate automatically after 3 unsuccessful resolution attempts
37. The system must fetch full conversation history via Freshdesk API: GET /api/v2/tickets/{id}/conversations
38. The system must degrade confidence with each unsuccessful turn for intelligent escalation

### NSW Strata Compliance
39. The system must categorize tickets across 8 primary categories with subcategories:
    - Maintenance & Repairs (common property, building systems, emergency repairs, amenities, defects)
    - By-Law Compliance (noise, parking, pets, smoking, rubbish, short-term letting, nuisance)
    - Financial Matters (levies, disputes, statements, insurance)
    - Governance & Administration (meetings, committees, by-laws, records, compliance)
    - Renovations & Alterations (cosmetic, minor, major - per three-tier approval system)
    - Disputes & Complaints (neighbor, owners corporation, strata manager, NCAT applications)
    - Security & Safety (access control, CCTV, hazards, fire safety)
    - Information Requests (general, onboarding, vendor enquiries)
40. The system must assign priority levels based on NSW regulations:
    - Critical: Emergency repairs, safety issues (same-day response per SSMA Section 106)
    - High: Urgent maintenance, compliance deadlines (4-hour response)
    - Medium: Routine matters (1 business day response)
    - Low: Information requests (2 business day response)
41. The system must reference specific legislation:
    - SSMA 2015 (Strata Schemes Management Act)
    - SSDA 2015 (Strata Schemes Development Act)
    - 18 model by-laws from Strata Schemes Management Regulation 2016
42. The system must handle 2025 reforms:
    - Capital works fund 10-year planning requirements
    - Enhanced disclosure obligations for strata managers
    - Accessibility infrastructure approvals (majority vote instead of special resolution)

### Scheduled Operations
43. The system must perform hourly checks for stale tickets (>48 hours) via Cron trigger
44. The system must execute nightly knowledge base maintenance at 2 AM:
    - Deduplication (cosine distance <0.1)
    - Success rate updates (<70% flagged)
    - Age-based review (>6 months unused)
45. The system must generate weekly optimization reports analyzing routing patterns
46. The system must identify recurring issues (similarity >0.90 in past 7 days)

### Error Handling
47. The system must implement three-tier error handling:
    - Node-level retry (3 attempts, 5-second delays)
    - Workflow-level error triggers with full context logging
    - System-level fallbacks for graceful degradation
48. The system must log all errors to monitoring database with ticket ID, error type, payload
49. The system must send Slack notifications for critical failures within 1 minute
50. The system must queue failed operations in Redis with 7-day TTL for retry

### Security
51. The system must use HTTPS exclusively with valid SSL certificates
52. The system must implement webhook signature verification using HMAC-SHA256
53. The system must validate JSON schema and sanitize all inputs
54. The system must mask PII in logs and implement 7-year retention per Australian requirements

### Monitoring and Reporting
55. The system must track infrastructure metrics via Prometheus:
    - Workflow execution duration (p50, p95, p99)
    - Queue depth and worker utilization
    - API rate limit consumption
56. The system must track business metrics:
    - Tickets processed per hour/day
    - Automation rate by category
    - Average similarity scores trending
    - Customer satisfaction scores (CSAT)
    - Resolution time by category and automation level
    - API costs per ticket ($0.50-2.00 target)
57. The system must provide real-time alerting for:
    - SLA breaches (15 minutes for critical)
    - Error rate >5%
    - Queue depth >100 pending
58. The system must generate monthly performance reports with recommendations
59. The system must maintain audit logs for all automated decisions with full traceability

## Non-Goals (Out of Scope)

1. This feature will NOT handle phone or voice-based support tickets
2. This feature will NOT process image attachments or handwritten documents
3. This feature will NOT make legal determinations or provide legal advice
4. This feature will NOT handle payment processing or financial transactions
5. This feature will NOT integrate with property management systems beyond Freshdesk
6. This feature will NOT support languages other than English
7. This feature will NOT automatically approve renovation applications without human review
8. This feature will NOT modify strata by-laws or governance documents
9. This feature will NOT handle emergency response coordination (fire, medical)
10. This feature will NOT replace human managers for committee meetings or AGMs

## Design Considerations

### Workflow Architecture
- Implement separation of concerns with distinct workflows for different ticket types
- Use n8n's queue mode for scalability with Redis message brokering
- Design for horizontal scaling by adding worker processes
- Maintain stateless workflow execution for reliability

### User Interface
- Provide clear status indicators in Freshdesk for AI-processed tickets
- Use tags to identify automation level (auto-resolved, ai-draft-review, escalated)
- Include confidence scores in private notes for human reviewers
- Format responses with proper HTML for Freshdesk display

### Knowledge Base Structure
- Organize knowledge entries with consistent template:
  - Title (concise, searchable)
  - Issue Description (what owners/tenants report)
  - NSW Legal Context (relevant sections, by-laws, reforms)
  - Solution Steps (numbered procedure)
  - Prevention Advice (avoiding recurrence)
  - Estimated Resolution Time (historical data)
  - Stakeholder Responsibilities (owner vs owners corporation vs manager)
  - Required Documentation (forms, approvals, certificates)
  - Success Rate (calculated from historical tickets)
  - Last Updated Date
- Include metadata for filtering: category, subcategory, property_id, created_date, success_rate
- Maintain human-readable format in GitHub: /knowledge/{category}/{subcategory}/{entry-id}.md
- Enable version control with YAML frontmatter for metadata

## Technical Considerations

### Infrastructure
- Deploy on n8n Cloud for managed service reliability
- Use Supabase Pro Plan ($25/month) for pgvector knowledge base
- Configure HNSW indexes for optimal vector search performance
- Implement Redis caching for frequent queries

### API Integration
- Use OpenAI text-embedding-3-small for cost-effective embeddings
- Implement Claude prompt caching for 90% cost reduction
- Configure Perplexity sonar-deep-research for comprehensive research
- Set up proper retry logic and rate limit handling for all APIs

### Data Management
- Store vectors as 1536-dimensional arrays in pgvector
- Implement hybrid search with pg_trgm extension for BM25 keyword matching
- Use JSONB for flexible metadata storage with GIN indexes
- Maintain database schema:
  - knowledge_base: id, content, title, embedding (vector(1536)), metadata (jsonb), search_keywords (text[])
  - training_examples: id, ticket_text, response_text, category, embedding, customer_satisfaction
  - conversation_state: ticket_id, conversation_history, current_knowledge_id, confidence_level
  - system_metrics: metric_name, value, timestamp, category

### Performance Optimization
- Target <200ms query latency for knowledge retrieval
- Batch embedding operations for 50% cost savings
- Cache frequent queries with 1-hour TTL
- Use connection pooling for concurrent database access

## Success Metrics

1. **Response Time Reduction**: Achieve 50-70% reduction in average first response time
2. **Automation Rate**: Reach 70-80% automated handling for routine tickets after 100 samples
3. **Customer Satisfaction**: Maintain CSAT scores above 4.5/5 stars
4. **Cost Efficiency**: Reduce operational costs by 60% within 6 months
5. **Knowledge Base Growth**: Add 50+ validated knowledge entries monthly
6. **Accuracy Rate**: Achieve 95%+ accuracy for auto-responses (no customer corrections needed)
7. **Escalation Rate**: Keep escalation rate below 20% for non-critical tickets
8. **SLA Compliance**: Meet 98%+ SLA targets for critical issue response times
9. **API Cost per Ticket**: Maintain average cost below $2.00 per ticket
10. **System Availability**: Achieve 99.9% uptime for webhook processing

## Open Questions

1. Should we integrate with additional communication channels (SMS, WhatsApp) in future phases?
2. How should we handle tickets in languages other than English if they arise?
3. Should we implement voice transcription for phone-based ticket creation?
4. Do we need integration with specific accounting systems for financial queries?
5. Should we consider fine-tuning models after reaching 500+ training examples?
6. How should we handle conflicting information between old and new regulations?
7. Should we implement automatic translation for multilingual property communities?
8. Do we need special handling for heritage-listed or unique property types?
9. Should we create property-specific knowledge bases for recurring issues?
10. How should we manage knowledge base updates when legislation changes mid-implementation?

## Implementation Timeline

### Month 1: Foundation
- Set up n8n Cloud environment and core integrations
- Configure Freshdesk webhooks and API connections
- Initialize Supabase pgvector knowledge base
- Implement basic ticket ingestion and categorization
- Deploy Manual Mode with full human review

### Month 2: Intelligence Layer
- Implement hybrid search with vector and keyword matching
- Configure AI integrations (Claude, Perplexity, OpenAI)
- Build decision engine with 5 routing paths
- Implement few-shot learning for Assisted Mode
- Deploy error handling and monitoring

### Month 3: Production Readiness
- Complete all 8 NSW strata category configurations
- Implement conversation handling and multi-turn support
- Deploy scheduled maintenance workflows
- Configure comprehensive monitoring and alerting
- Launch Autonomous Mode for high-confidence tickets
- Complete security hardening and compliance checks

## Cost Breakdown

### Monthly Operating Costs (Medium-Scale: 30-50 properties, 100-300 tickets)
- **OpenAI Embeddings**: $5-20/month (text-embedding-3-small at $0.02/1M tokens)
- **Claude API**: $50-200/month (Sonnet model with prompt caching)
- **Perplexity API**: $20-50/month (5 RPM deep research limit)
- **Supabase Pro**: $25/month (8GB database, pgvector support)
- **n8n Cloud**: $50/month (managed service)
- **Redis (optional)**: $10-30/month (queue management)
- **Total Estimate**: $150-350/month
- **Cost per Ticket Target**: $0.50-2.00

### Optimization Strategies
- Use GPT-4o Mini for classification after 50 samples ($0.15/1M tokens)
- Batch embeddings for 50% cost reduction
- Implement aggressive caching (1-hour TTL)
- Fine-tune models after 500+ examples for 3× cheaper inference

## Deployment Architecture

### Environment Progression
1. **Local Development**: Docker-based n8n for initial testing
2. **Development Environment**: Cloud/VPS with test Freshdesk instance
3. **Staging Environment**: Production-like with 20% sampled tickets
4. **Production Environment**: n8n Cloud with queue mode and multiple workers

### Queue Mode Configuration
- **EXECUTIONS_MODE**: queue
- **Redis Configuration**: QUEUE_BULL_REDIS_HOST for message brokering
- **Worker Scaling**: Horizontal scaling supporting 200+ concurrent tickets
- **Webhook Receivers**: Instant acknowledgment with async processing
- **Worker Processes**: Pull jobs from Redis, process with AI/DB calls

## Risk Mitigation

1. **API Dependency**: Implement multiple AI provider fallbacks
2. **Data Privacy**: Ensure PII masking and compliance with privacy regulations
3. **System Failures**: Design for graceful degradation with human fallback
4. **Knowledge Accuracy**: Require human approval for all new knowledge entries
5. **Cost Overruns**: Monitor API usage closely with automated alerts
6. **Regulatory Changes**: Maintain separate workflow for bulk knowledge updates
7. **Performance Degradation**: Implement circuit breakers and rate limiting
8. **Data Loss**: Daily backups of workflows, database, and knowledge base