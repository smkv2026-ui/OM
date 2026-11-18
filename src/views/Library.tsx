import { useMemo, useState } from 'react';
import { BookmarkIcon, ChevronLeft, ChevronRight, SearchIcon } from '../components/Icons';
import { TopBar } from '../components/Shell';
import { Badge, Chip } from '../components/ui';
import { CHAKRAS, GRANTHAS, granthaById, NADIS, PRANAS, type Grantha, type GranthaCategory } from '../data';
import { navigate } from '../lib/router';
import { openChakra, openNadi, openPrana, useSettings } from '../lib/store';

const CATS: GranthaCategory[] = ['Upanishad', 'Tantra', 'Yoga text', 'Purana', 'Other'];

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export default function Library({ route }: { route: string }) {
  const id = route.split('/')[2];
  const g = id ? granthaById(decodeURIComponent(id)) : undefined;
  return g ? <Detail g={g} /> : <List />;
}

type Filter = { kind: 'cat' | 'chakra' | 'nadi' | 'prana' | 'saved'; value: string } | null;

function List() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>(null);
  const bookmarks = useSettings((s) => s.bookmarks);

  const items = useMemo(() => {
    const nq = norm(q.trim());
    return GRANTHAS.filter((g) => {
      if (filter) {
        if (filter.kind === 'cat' && g.category !== filter.value) return false;
        if (filter.kind === 'chakra' && !g.chakras.includes(filter.value as never)) return false;
        if (filter.kind === 'nadi' && !g.nadis.includes(filter.value as never)) return false;
        if (filter.kind === 'prana' && !g.pranas.includes(filter.value as never)) return false;
        if (filter.kind === 'saved' && !bookmarks.includes(g.id)) return false;
      }
      if (!nq) return true;
      const hay = norm(
        [g.title, g.deva, g.category, g.tradition, g.summary, g.relevance, ...g.keyTeachings, ...g.verses.map((v) => `${v.transliteration ?? ''} ${v.translation} ${v.citation}`)].join(' '),
      );
      return nq.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [q, filter, bookmarks]);

  const is = (kind: NonNullable<Filter>['kind'], value: string) => filter?.kind === kind && filter.value === value;
  const pick = (kind: NonNullable<Filter>['kind'], value: string) => setFilter(is(kind, value) ? null : { kind, value });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="Granthas" subtitle="Upaniṣads, Tantras and yoga texts on the nāḍīs, cakras and prāṇas" />
      <div className="scroll-y min-h-0 flex-1 px-4 pb-8 lg:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <label className="glass flex min-h-12 items-center gap-3 rounded-2xl px-4">
            <SearchIcon size={18} className="text-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search texts, teachings, verses… (e.g. suṣumnā, udana, heart)"
              aria-label="Search the library"
              className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-faint"
            />
          </label>
          <div className="flex flex-col gap-2" aria-label="Filters">
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0 [&>*]:shrink-0">
              <Chip active={filter?.kind === 'saved'} onClick={() => pick('saved', 'saved')}>
                ★ Saved ({bookmarks.length})
              </Chip>
              {CATS.map((c) => (
                <Chip key={c} active={is('cat', c)} onClick={() => pick('cat', c)}>
                  {c}
                </Chip>
              ))}
            </div>
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0 [&>*]:shrink-0">
              {NADIS.map((n) => (
                <Chip key={n.id} active={is('nadi', n.id)} onClick={() => pick('nadi', n.id)} color={n.color}>
                  {n.name}
                </Chip>
              ))}
              {PRANAS.map((p) => (
                <Chip key={p.id} active={is('prana', p.id)} onClick={() => pick('prana', p.id)} color={p.glow ?? p.color}>
                  {p.name}
                </Chip>
              ))}
            </div>
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0 [&>*]:shrink-0">
              {CHAKRAS.map((c) => (
                <Chip key={c.id} active={is('chakra', c.id)} onClick={() => pick('chakra', c.id)} color={c.color.rainbow ? '#c9a7ff' : c.color.primary}>
                  {c.name}
                </Chip>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted" aria-live="polite">
            {items.length} of {GRANTHAS.length} texts
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((g) => (
              <li key={g.id}>
                <Card g={g} saved={bookmarks.includes(g.id)} />
              </li>
            ))}
          </ul>
          {items.length === 0 && <p className="py-10 text-center text-muted">No texts match. Try a different word or clear the filter.</p>}
        </div>
      </div>
    </div>
  );
}

function Card({ g, saved }: { g: Grantha; saved: boolean }) {
  const toggle = useSettings((s) => s.toggleBookmark);
  return (
    <article className="glass hairline-glow group relative flex h-full flex-col gap-2 rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">{g.category}</p>
          <h2 className="font-display text-xl leading-tight font-semibold">
            <a
              href={`#/library/${g.id}`}
              className="after:absolute after:inset-0"
              onClick={(e) => {
                e.preventDefault();
                navigate(`/library/${g.id}`);
              }}
            >
              {g.title}
            </a>
          </h2>
          {g.deva && <p className="font-deva text-sm text-muted">{g.deva}</p>}
        </div>
        <button
          className="btn btn-icon relative z-10 !min-h-10 !w-10 !rounded-full"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${g.title} from saved` : `Save ${g.title}`}
          onClick={() => toggle(g.id)}
          style={{ color: saved ? 'var(--gold)' : undefined }}
        >
          <BookmarkIcon size={18} filled={saved} />
        </button>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted">{g.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {g.verses.length > 0 && <Badge>{g.verses.length} verse{g.verses.length > 1 ? 's' : ''}</Badge>}
        {g.needsVerification && <Badge tone="warn">needs verification</Badge>}
        <span className="ml-auto flex gap-1" aria-hidden>
          {g.chakras.map((c) => {
            const k = CHAKRAS.find((x) => x.id === c)!;
            return <span key={c} className="h-2 w-2 rounded-full" style={{ background: k.color.rainbow ? '#c9a7ff' : k.color.primary, boxShadow: `inset 0 0 0 1px ${k.color.ink}` }} />;
          })}
        </span>
      </div>
    </article>
  );
}

function Detail({ g }: { g: Grantha }) {
  const saved = useSettings((s) => s.bookmarks.includes(g.id));
  const toggle = useSettings((s) => s.toggleBookmark);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title={g.title}
        subtitle={g.tradition}
        actions={
          <button className="btn !min-h-11 !rounded-full text-xs" onClick={() => navigate('/library')} aria-label="Back to library">
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Library</span>
          </button>
        }
      />
      <div className="scroll-y min-h-0 flex-1 px-4 pb-10 lg:px-6">
        <article className="mx-auto flex max-w-3xl flex-col gap-5">
          <header className="flex flex-wrap items-center gap-2">
            {g.deva && <span className="font-deva text-2xl">{g.deva}</span>}
            <Badge tone="muted">{g.category}</Badge>
            {g.needsVerification && <Badge tone="warn">needs verification</Badge>}
            <button className="btn ml-auto !min-h-10 !rounded-full text-xs" aria-pressed={saved} onClick={() => toggle(g.id)} style={{ color: saved ? 'var(--gold-ink)' : undefined }}>
              <BookmarkIcon size={16} filled={saved} /> {saved ? 'Saved' : 'Save'}
            </button>
          </header>
          <p className="font-display text-xl leading-relaxed">{g.summary}</p>

          <section className="glass rounded-2xl p-4">
            <h2 className="eyebrow mb-2">Key teachings</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
              {g.keyTeachings.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </section>

          <section className="glass rounded-2xl p-4">
            <h2 className="eyebrow mb-2">Relevance to Ida · Pingala · Sushumna</h2>
            <p className="leading-relaxed">{g.relevance}</p>
          </section>

          {g.verses.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="eyebrow">Verses</h2>
              {g.verses.map((v) => (
                <figure key={v.citation} className="glass hairline-glow rounded-2xl p-5">
                  {v.sanskrit && <p className="font-deva mb-2 text-lg leading-loose">{v.sanskrit}</p>}
                  {v.transliteration && <p className="mb-3 text-sm text-muted italic">{v.transliteration}</p>}
                  <blockquote className="font-display text-lg leading-relaxed">“{v.translation}”</blockquote>
                  <figcaption className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    — {v.citation}
                    {v.verify && <Badge tone="warn">verify numbering against your edition</Badge>}
                  </figcaption>
                </figure>
              ))}
              <p className="text-xs text-faint">Translations are summarised renderings for study; consult a critical edition for scholarly use.</p>
            </section>
          ) : (
            <p className="glass rounded-2xl p-4 text-sm text-muted">
              No verses are quoted for this text — a summary is given instead{g.needsVerification ? ' and the entry is marked “needs verification”' : ''}, so nothing here is presented as an exact quotation.
            </p>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="eyebrow">Cross-links</h2>
            <div className="flex flex-wrap gap-2">
              {g.chakras.map((c) => {
                const k = CHAKRAS.find((x) => x.id === c)!;
                return (
                  <Chip key={c} color={k.color.rainbow ? '#c9a7ff' : k.color.primary} onClick={() => openChakra(k.id)}>
                    {k.name}
                  </Chip>
                );
              })}
              {g.nadis.map((n) => {
                const k = NADIS.find((x) => x.id === n)!;
                return (
                  <Chip key={n} color={k.color} onClick={() => openNadi(k.id)}>
                    {k.name}
                  </Chip>
                );
              })}
              {g.pranas.map((p) => {
                const k = PRANAS.find((x) => x.id === p)!;
                return (
                  <Chip key={p} color={k.glow ?? k.color} onClick={() => openPrana(k.id)}>
                    {k.name}
                  </Chip>
                );
              })}
            </div>
            {g.related.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {g.related.map((r) => {
                  const rg = granthaById(r);
                  if (!rg) return null;
                  return (
                    <li key={r}>
                      <a
                        href={`#/library/${r}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/library/${r}`);
                        }}
                        className="glass flex min-h-12 items-center justify-between rounded-xl px-3 py-2 hover:border-[var(--border-hi)]"
                      >
                        <span>
                          <span className="block text-sm font-medium">{rg.title}</span>
                          <span className="text-xs text-muted">{rg.category}</span>
                        </span>
                        <ChevronRight size={16} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </article>
      </div>
    </div>
  );
}
