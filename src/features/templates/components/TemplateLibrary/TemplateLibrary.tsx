import { useMemo, useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Dismiss24Regular, ChevronLeft24Regular, ChevronRight24Regular } from '@fluentui/react-icons';
import { mergeClasses, Spinner } from '@fluentui/react-components';
import { t } from '@/i18n/i18n';
import { useTemplateStore } from '../../store/templateStore';
import { TemplateCard } from '../TemplateCard';
import { TemplateSearch } from '../TemplateSearch';
import { useStyles } from './TemplateLibrary.styles';

interface TemplateLibraryProps {
  onSelect: (slug: string) => void;
}

const ALL_CATEGORY = 'All';
const MAX_VISIBLE_FIELDS = 8;

export function TemplateLibrary({ onSelect }: TemplateLibraryProps) {
  const s = useStyles();
  const { isOpen, templates, searchQuery, closeLibrary, setSearchQuery } = useTemplateStore(
    useShallow((s) => ({ isOpen: s.isOpen, templates: s.templates, searchQuery: s.searchQuery, closeLibrary: s.closeLibrary, setSearchQuery: s.setSearchQuery })),
  );
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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

  const goPrev = useCallback(() => {
    setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i);
  }, []);
  const goNext = useCallback(() => {
    setLightboxIndex(i => i !== null && i < filtered.length - 1 ? i + 1 : i);
  }, [filtered.length]);
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null); setLoading(false);
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

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeLibrary();
  };

  const handleLightboxBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeLightbox();
  };

  const handleUseTemplate = async () => {
    if (!lightboxTemplate || loading) return;
    setLoading(true);
    try { await onSelect(lightboxTemplate.slug); }
    catch { setLoading(false); }
  };

  return (
    <>
      <div className={s.overlay} onClick={handleBackdropClick}>
        <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="template-library-title">
          <div className={s.header}>
            <div className={s.titleRow}>
              <div id="template-library-title" className={s.title}>{t('templates.modal.title')}</div>
              <button type="button" className={s.closeBtn} onClick={closeLibrary} aria-label={t('common.close')}>
                <Dismiss24Regular />
              </button>
            </div>
            <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
            <div className={s.categoryRow}>
              {categories.map(cat => (
                <button key={cat} type="button"
                  className={cat === activeCategory ? s.categoryChipActive : s.categoryChip}
                  onClick={() => setActiveCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className={s.content}>
            {filtered.length === 0 && <div className={s.empty}>
              {templates.length === 0 ? t('templates.modal.emptyLibrary') : t('templates.modal.empty')}
            </div>}
            {filtered.map((tmpl, idx) => (
              <TemplateCard key={tmpl.slug} slug={tmpl.slug} name={tmpl.name} description={tmpl.description}
                onClick={() => setLightboxIndex(idx)} />
            ))}
          </div>
        </div>
      </div>

      {lightboxTemplate && (
        <div className={s.lightboxOverlay} onClick={handleLightboxBackdropClick}>
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
                <span className={s.lightboxName}>{lightboxTemplate.name}</span>
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
              <button type="button" className={mergeClasses(s.lightboxUseBtn, loading && s.lightboxUseBtnLoading)}
                onClick={handleUseTemplate} disabled={loading}>
                {loading ? <><Spinner size="tiny" /> {t('templates.detail.loading')}</> : t('templates.detail.useButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
