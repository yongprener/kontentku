import { workflowRoutePaths, workflowStages } from '@/lib/flow';
import { apiErrorCodes, MAX_CONTENT_PER_BATCH } from '@/lib/domain/contracts';

const contractCards = [
  {
    name: 'ProductSnapshot',
    detail: 'Draft/approved snapshot with curated media and approval lock.',
  },
  {
    name: 'MediaAsset',
    detail: 'Scraped or uploaded media with active/inactive state.',
  },
  {
    name: 'GenerationJob',
    detail: 'Queued processing model with explicit batch count and terminal states.',
  },
  {
    name: 'ContentVariant',
    detail: 'Generated output with hook, script, caption, 3 hashtags, and media selection.',
  },
];

export function DashboardShell() {
  return (
    <main>
      <section className="surface shell">
        <div className="topbar">
          <div>
            <div className="eyebrow">Kontentku / slice 1</div>
            <h1 className="title">App Router MVP foundation for the approved product flow.</h1>
            <p className="subtitle">
              This bootstraps the dashboard shell, strict domain contracts, and a SQLite-ready mapping layer
              so later scrape, review, approve, and generation slices can land without changing the core model.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            Ready for follow-up slices
          </div>
        </div>

        <div className="grid">
          <article className="card hero">
            <div className="stack">
              <h2>Flow scaffold</h2>
              <p>
                The product path is reserved from URL intake through generation and generate-more, but only the
                slice-1 shell and contracts are active now.
              </p>
              <ul className="list">
                {workflowStages.map((stage) => (
                  <li className="list-item" key={stage.name}>
                    <div>
                      <strong>{stage.name}</strong>
                      <span>{stage.description}</span>
                    </div>
                    <span className="code">{stage.route}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="stack">
              <h3>API contract guardrails</h3>
              <p>
                The upcoming API layer is constrained by the approved flow rules and the hard batch limit of{' '}
                <span className="code">{MAX_CONTENT_PER_BATCH}</span> per request.
              </p>
              <ul className="list">
                {apiErrorCodes.map((code) => (
                  <li className="list-item" key={code}>
                    <div>
                      <strong>{code}</strong>
                      <span>Reserved error code for the later endpoint layer.</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <section className="summary-grid">
            {contractCards.map((card) => (
              <article className="card summary-stat" key={card.name}>
                <span className="eyebrow">Core contract</span>
                <strong>{card.name}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="card footer-note">
            Route placeholders are reserved in <span className="code">{workflowRoutePaths.dashboard}</span>,{' '}
            <span className="code">{workflowRoutePaths.scrape}</span>, <span className="code">{workflowRoutePaths.review}</span>,{' '}
            <span className="code">{workflowRoutePaths.approve}</span>, <span className="code">{workflowRoutePaths.generate}</span>, and{' '}
            <span className="code">{workflowRoutePaths.generateMore}</span> for the later slices.
          </section>
        </div>
      </section>
    </main>
  );
}
