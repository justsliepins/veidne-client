import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Dismiss24Regular, ChevronLeft24Regular, ChevronRight24Regular } from '@fluentui/react-icons';
import { mergeClasses, Spinner } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { useTemplateStore } from '../../store/templateStore';
import { loadSession } from '@/features/editor/utils/sessionPersistence';
import { TemplateCard } from '../TemplateCard';
import { TemplateSearch } from '../TemplateSearch';
import { useStyles } from './TemplateLibrary.styles';

interface TemplateLibraryProps {
  onSelect: (slug: string) => void;
}

const ALL_CATEGORY = 'All';
const MAX_VISIBLE_FIELDS = 8;
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]';

/** Focusable elements of `layer` that are rendered (getClientRects also
 *  counts position: fixed elements, which have no offsetParent). */
function focusables(layer: HTMLElement): HTMLElement[] {
  return [...layer.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

export function TemplateLibrary({ onSelect }: TemplateLibraryProps) {
  const s = useStyles();
  const { isOpen, templates, status, searchQuery, closeLibrary, setSearchQuery, fetchTemplates } = useTemplateStore(
    useShallow((s) => ({ isOpen: s.isOpen, templates: s.templates, status: s.status, searchQuery: s.searchQuery, closeLibrary: s.closeLibrary, setSearchQuery: s.setSearchQuery, fetchTemplates: s.fetchTemplates })),
  );
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // "Use this template" failed (the API and the static file both failed).
  const [useFailed, setUseFailed] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const useBtnRef = useRef<HTMLButtonElement>(null);
  // The control that opened the preview (a template card), to return to.
  const previewOpenerRef = useRef<HTMLElement | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return [ALL_CATEGORY, ...Array.from(cats).sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    let result = templates;
    if (activeCategory !== ALL_CATEGORY) {
      result = result.filter(t => t.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return result;
  }, [templates, searchQuery, activeCategory]);

  const lightboxTemplate = lightboxIndex !== null ? filtered[lightboxIndex] ?? null : null;

  // One state at a time: loading, error, empty library, no search match, or the list.
  const listLoading = status === 'idle' || status === 'loading';
  const listFailed = status === 'error';
  const listEmpty = status === 'ready' && templates.length === 0;
  const noMatch = status === 'ready' && templates.length > 0 && filtered.length === 0;

  // Screen reader announcement (WCAG 4.1.3). The live region is rendered empty
  // with the dialog and filled one tick later, so it exists before its text
  // changes; text present at insertion is not reliably announced.
  const announcement = !isOpen ? '' : listLoading ? t('templates.modal.loading') : noMatch ? t('templates.modal.empty') : '';
  const [liveText, setLiveText] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setLiveText(announcement), 0);
    return () => clearTimeout(id);
  }, [announcement]);

  const retry = useCallback(() => {
    // The retry button is replaced by the loading state; keep focus in the dialog.
    titleRef.current?.focus();
    void fetchTemplates();
  }, [fetchTemplates]);

  const goPrev = useCallback(() => {
    setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i);
    setUseFailed(false);
  }, []);
  const goNext = useCallback(() => {
    setLightboxIndex(i => i !== null && i < filtered.length - 1 ? i + 1 : i);
    setUseFailed(false);
  }, [filtered.length]);
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null); setLoading(false); setUseFailed(false);
  }, []);

  useEffect(() => {
    if (!isOpen) { setLightboxIndex(null); setLoading(false); return; }
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex !== null) {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') goPrev();
        else if (e.key === 'ArrowRight') goNext();
      } else {
        if (e.key === 'Escape') closeLibrary();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeLibrary, lightboxIndex, closeLightbox, goPrev, goNext]);

  // Focus moves into the dialog when it opens and back to the control that
  // opened it when it closes (WCAG 2.4.3; PD-13). Not when a template or
  // "Open your Word document" has taken the user to the editor.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const path = window.location.pathname;
    const raf = requestAnimationFrame(() => titleRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      // After the close has rendered and any navigation has happened.
      setTimeout(() => {
        if (!opener || window.location.pathname !== path || !document.contains(opener)) return;
        if (opener.closest('[inert]') || opener.getClientRects().length === 0) return;
        opener.focus();
      }, 0);
    };
  }, [isOpen]);

  // Rendered into document.body, so the page behind can be made inert while
  // the library is open: the Tab trap alone does not stop a screen reader's
  // virtual cursor (review c, finding 18). Nothing renders while closed, so the
  // static HTML does not change.
  useEffect(() => {
    if (!isOpen) return;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    return () => root?.removeAttribute('inert');
  }, [isOpen]);

  // A saved, unfinished project is replaced by the template: the preview says
  // so next to the button (review b, finding 5).
  const [replacesProject, setReplacesProject] = useState(false);

  // The preview takes focus on its main action and gives it back to the card.
  const previewOpen = lightboxTemplate !== null;
  useEffect(() => {
    if (!previewOpen) return;
    const title = titleRef.current;
    const raf = requestAnimationFrame(() => useBtnRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      const card = previewOpenerRef.current;
      previewOpenerRef.current = null;
      setTimeout(() => {
        if (!useTemplateStore.getState().isOpen) return;
        if (card && document.contains(card)) card.focus();
        else title?.focus();
      }, 0);
    };
  }, [previewOpen]);

  // Tab and Shift+Tab stay inside the layer on top: the preview when it is
  // open, otherwise the dialog (aria-modal="true" promises this).
  useEffect(() => {
    if (!isOpen) return;
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const layer = previewOpen ? previewRef.current : cardRef.current;
      if (!layer) return;
      const items = focusables(layer);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !layer.contains(active)) {
        e.preventDefault(); (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === titleRef.current)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [isOpen, previewOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeLibrary();
  };

  const handleLightboxBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeLightbox();
  };

  const handleUseTemplate = async () => {
    if (!lightboxTemplate || loading) return;
    setLoading(true); setUseFailed(false);
    try { await onSelect(lightboxTemplate.slug); }
    catch {
      setLoading(false); setUseFailed(true);
      // The button lost focus while it was disabled.
      requestAnimationFrame(() => useBtnRef.current?.focus());
    }
  };

  return createPortal(
    <>
      <div className={s.overlay} onClick={handleBackdropClick}>
        <div ref={cardRef} className={s.card} role="dialog" aria-modal="true" aria-labelledby="template-library-title">
          <p className={s.srOnly} role="status">{liveText}</p>
          <div className={s.header}>
            <div className={s.titleRow}>
              <div id="template-library-title" ref={titleRef} tabIndex={-1} className={s.title}>{t('templates.modal.title')}</div>
              <button type="button" className={s.closeBtn} onClick={closeLibrary} aria-label={t('common.close')}>
                <Dismiss24Regular />
              </button>
            </div>
            <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
            <div className={s.categoryRow} role="group" aria-label={t('templates.modal.categoryGroup')}>
              {categories.map(cat => (
                <button key={cat} type="button" aria-pressed={cat === activeCategory}
                  className={cat === activeCategory ? s.categoryChipActive : s.categoryChip}
                  onClick={() => setActiveCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className={s.content} aria-busy={listLoading}>
            {listLoading && (
              <div className={s.stateBox}>
                <Spinner size="small" label={t('templates.modal.loading')} />
              </div>
            )}
            {listFailed && (
              <div className={s.stateBox} role="alert">
                <strong className={s.stateTitle}>{t('templates.modal.errorTitle')}</strong>
                <p className={s.stateText}>{t('templates.modal.errorText')}</p>
                <div className={s.stateActions}>
                  <button type="button" className={s.stateGhost} onClick={retry}>{t('templates.modal.retry')}</button>
                  <Link to="/editor" className={s.statePrimary} onClick={closeLibrary}>{t('templates.modal.openOwn')}</Link>
                </div>
              </div>
            )}
            {listEmpty && (
              <div className={s.stateBox}>
                <p className={s.stateText}>{t('templates.modal.emptyLibrary')}</p>
                <div className={s.stateActions}>
                  <Link to="/editor" className={s.statePrimary} onClick={closeLibrary}>{t('templates.modal.openOwn')}</Link>
                </div>
              </div>
            )}
            {noMatch && <div className={s.empty}>{t('templates.modal.empty')}</div>}
            {status === 'ready' && filtered.map((tmpl, idx) => (
              <TemplateCard key={tmpl.slug} slug={tmpl.slug} name={tmpl.name} description={tmpl.description}
                onClick={() => {
                  previewOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                  setReplacesProject(Boolean(loadSession()?.rawDocxBase64));
                  setUseFailed(false); setLightboxIndex(idx);
                }} />
            ))}
          </div>
        </div>
      </div>

      {lightboxTemplate && (
        <div ref={previewRef} className={s.lightboxOverlay} onClick={handleLightboxBackdropClick}
          role="dialog" aria-modal="true" aria-labelledby="template-preview-name">
          <button type="button" className={s.lightboxCloseBtn} onClick={closeLightbox} aria-label={t('common.close')}>
            <Dismiss24Regular />
          </button>

          {lightboxIndex !== null && lightboxIndex > 0 && (
            <button type="button" className={mergeClasses(s.lightboxArrow, s.lightboxArrowLeft)}
              onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous">
              <ChevronLeft24Regular />
            </button>
          )}
          {lightboxIndex !== null && lightboxIndex < filtered.length - 1 && (
            <button type="button" className={mergeClasses(s.lightboxArrow, s.lightboxArrowRight)}
              onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next">
              <ChevronRight24Regular />
            </button>
          )}

          <div className={s.lightboxPanel} onClick={(e) => e.stopPropagation()}>
            <div className={s.lightboxPreviewZone}>
              <img className={s.lightboxPreview} src={`/templates/${lightboxTemplate.slug}.png`} alt={lightboxTemplate.name} />
            </div>
            <div className={s.lightboxInfo}>
              <div className={s.lightboxNameRow}>
                <span id="template-preview-name" className={s.lightboxName}>{lightboxTemplate.name}</span>
                <span className={s.lightboxCategoryBadge}>{lightboxTemplate.category}</span>
              </div>
              <div className={s.lightboxDescription}>{lightboxTemplate.description}</div>
              {(lightboxTemplate.fields?.length ?? 0) > 0 && (
                <>
                  <div className={s.lightboxFieldsLabel}>{t('templates.detail.fields')}</div>
                  <div className={s.lightboxFieldsWrap}>
                    {lightboxTemplate.fields!.slice(0, MAX_VISIBLE_FIELDS).map(f => (
                      <span key={f} className={s.lightboxFieldChip}>{f}</span>
                    ))}
                    {lightboxTemplate.fields!.length > MAX_VISIBLE_FIELDS && (
                      <span className={s.lightboxMoreFields}>{t('templates.detail.fieldsMore', { count: String(lightboxTemplate.fields!.length - MAX_VISIBLE_FIELDS) })}</span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className={s.lightboxCta}>
              {useFailed && <p className={s.lightboxError} role="alert">{t('templates.detail.error')}</p>}
              {replacesProject && <p className={s.lightboxNote}>{t('templates.detail.replacesProject')}</p>}
              <button ref={useBtnRef} type="button" className={mergeClasses(s.lightboxUseBtn, loading && s.lightboxUseBtnLoading)}
                onClick={handleUseTemplate} disabled={loading}>
                {loading ? <><Spinner size="tiny" /> {t('templates.detail.loading')}</> : t('templates.detail.useButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
