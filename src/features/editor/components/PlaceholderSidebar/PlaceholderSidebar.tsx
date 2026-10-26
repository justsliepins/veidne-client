import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { mergeClasses } from '@fluentui/react-components';
import { ChevronRight16Regular, ChevronLeft16Regular, ChevronUp16Regular, ChevronDown16Regular, DocumentBulletList24Regular, Edit16Regular, Delete16Regular, Image16Regular } from '@fluentui/react-icons';
import { t } from '@/i18n/i18n';
import { VeidneButton } from '@/shared/components/VeidneButton/VeidneButton';
import { useEditorStore } from '../../store/editorStore';
import { getPlaceholderColor } from '../../utils/placeholderColors';
import { useStyles } from './PlaceholderSidebar.styles';

interface PlaceholderSidebarProps {
  onScrollTo: (placeholderId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUploadData: () => void;
  /** Data already loaded: the forward action returns to the preview instead
   *  of asking for the spreadsheet again. */
  dataLoaded?: boolean;
}

export function PlaceholderSidebar({ onScrollTo, collapsed, onToggleCollapse, onUploadData, dataLoaded = false }: PlaceholderSidebarProps) {
  const s = useStyles();
  const { placeholders, selectedPlaceholderId, renamePlaceholder, deletePlaceholder } = useEditorStore(
    useShallow((s) => ({
      placeholders: s.placeholders,
      selectedPlaceholderId: s.selectedPlaceholderId,
      renamePlaceholder: s.renamePlaceholder,
      deletePlaceholder: s.deletePlaceholder,
    })),
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Below md the FAB toggle is hidden and the header bar is the toggle; at or
  // above md the FAB is the visible toggle, so the header (which also fires the
  // toggle, and slides off-screen when collapsed) must leave the tab order to
  // avoid a duplicate, partly off-screen collapse control (F15).
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const startEdit = (id: string, name: string) => { setEditingId(id); setDraft(name); };
  const cancelEdit = () => setEditingId(null);
  const commitEdit = () => {
    if (editingId) {
      const name = draft.trim();
      const current = placeholders.find(p => p.id === editingId);
      if (name && current && name !== current.name) renamePlaceholder(editingId, name);
    }
    setEditingId(null);
  };
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  return (
    <>
      {/* Desktop side toggle (hidden on mobile, where the header bar toggles). */}
      <button
        type="button"
        className={mergeClasses(s.toggle, collapsed && s.toggleCollapsed)}
        onClick={onToggleCollapse}
        aria-label={collapsed ? t('a11y.expandSidebar') : t('a11y.collapseSidebar')}
        title={collapsed ? t('a11y.expandSidebar') : t('a11y.collapseSidebar')}
      >
        <span className={s.chevronIcon}>
          {collapsed ? <ChevronLeft16Regular /> : <ChevronRight16Regular />}
        </span>
        <span className={s.fabIcon}><DocumentBulletList24Regular /></span>
        {placeholders.length > 0 && <span className={s.fabBadge}>{placeholders.length}</span>}
      </button>

      <div className={mergeClasses(s.root, collapsed && s.collapsed)}>
        <button
          type="button"
          className={s.header}
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('a11y.expandSidebar') : t('a11y.collapseSidebar')}
          tabIndex={isMobile ? undefined : -1}
        >
          <span>{t('placeholder.sidebar.title')} ({placeholders.length})</span>
          <span className={s.headerChevron} aria-hidden="true">
            {collapsed ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
          </span>
        </button>

        <div className={mergeClasses(s.fieldList, collapsed && s.collapsedHideMobile)}>
          {placeholders.length === 0 ? (
            <div className={s.empty}>{t('placeholder.sidebar.empty')}</div>
          ) : (
            placeholders.map(ph => {
              const color = getPlaceholderColor(ph.colorIndex);
              const isEditing = editingId === ph.id;
              return (
                <div
                  key={ph.id}
                  className={mergeClasses(s.item, selectedPlaceholderId === ph.id && s.itemActive)}
                  onClick={() => { if (!isEditing) onScrollTo(ph.id); }}
                >
                  {ph.type === 'image'
                    ? <Image16Regular style={{ color: color.dot, flexShrink: 0 }} aria-hidden="true" />
                    : <span className={s.dot} style={{ backgroundColor: color.dot }} />}
                  {isEditing ? (
                    <input
                      className={s.editInput}
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={commitEdit}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t('placeholder.field.nameInput')}
                    />
                  ) : (
                    <>
                      <span
                        className={s.name}
                        onClick={(e) => { e.stopPropagation(); startEdit(ph.id, ph.name); }}
                        title={t('placeholder.field.rename')}
                      >
                        {ph.name}
                      </span>
                      {ph.type === 'image' && (
                        <span style={{ fontSize: '11px', color: '#767077', flexShrink: 0 }}>
                          {t('imageField.sidebar.suffix')}
                        </span>
                      )}
                      <span className={s.count} data-row-count>x{ph.occurrences.length}</span>
                      <span className={s.actions} data-row-actions>
                        <button
                          type="button"
                          className={mergeClasses(s.iconBtn, s.iconBtnEdit)}
                          onClick={(e) => { e.stopPropagation(); startEdit(ph.id, ph.name); }}
                          aria-label={t('placeholder.field.renameNamed', { name: ph.name })}
                        >
                          <Edit16Regular />
                        </button>
                        <button
                          type="button"
                          className={s.iconBtn}
                          onClick={(e) => { e.stopPropagation(); deletePlaceholder(ph.id); }}
                          aria-label={t('placeholder.field.deleteNamed', { name: ph.name })}
                        >
                          <Delete16Regular />
                        </button>
                      </span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
        {placeholders.length > 0 && (
          <div className={mergeClasses(s.ctaWrapper, collapsed && s.collapsedHideMobile)}>
            <VeidneButton appearance="primary"
              onClick={onUploadData} style={{ width: '100%' }}>
              {t(dataLoaded ? 'placeholder.sidebar.backToPreview' : 'placeholder.sidebar.uploadData')}
            </VeidneButton>
          </div>
        )}
      </div>
    </>
  );
}
