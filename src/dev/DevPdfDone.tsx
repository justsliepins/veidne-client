import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataStore } from '@/features/data/store/dataStore';
import { useGeneratorStore } from '@/features/generator/store/generatorStore';
import { usePdfStore } from '@/features/generator/store/pdfStore';
import { DoneView } from '@/features/generator/pages/Done';
import {
  buildFixtureTemplate,
  buildFixtureRows,
  FIXTURE_PLACEHOLDERS,
  FIXTURE_COLUMN_MAPPING,
} from './fixtures';

/**
 * DEV-ONLY seed route (/dev/pdf-done?n=N&corrupt=C). Registered only when
 * import.meta.env.DEV, tree-shaken out of production builds. It runs the REAL
 * generation pipeline on a fixture template + N rows, seeds the real stores, and
 * renders the real DoneView so the PDF flow under E2E test is the real
 * components, real pdfStore, and real pdfConversion service against local
 * Proteus. `corrupt=C` replaces the last C generated blobs with non-docx bytes
 * so the real converter fails those jobs (drives the failed terminal phase).
 * It calls generate() directly, so it records no generate_completed event:
 * that event is emitted by the Editor's generate handler. Not part of the
 * shipped app.
 */
export default function DevPdfDone() {
  const [params] = useSearchParams();
  const n = Math.max(1, Math.trunc(Number(params.get('n') ?? '12')) || 12);
  const corrupt = Math.max(0, Math.trunc(Number(params.get('corrupt') ?? '0')) || 0);
  const [ready, setReady] = useState(false);
  // Seed exactly once. React StrictMode double-invokes effects in dev, which
  // would otherwise run two concurrent generate() passes and duplicate rows.
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    void (async () => {
      usePdfStore.getState().reset();
      useGeneratorStore.getState().reset();
      useDataStore.getState().setNamingConfig({ field: 'Name', dupeMode: 'number', secondField: null });
      const template = await buildFixtureTemplate();
      const rows = buildFixtureRows(n);
      await useGeneratorStore
        .getState()
        .generate(template, FIXTURE_PLACEHOLDERS, rows, FIXTURE_COLUMN_MAPPING, 'Fixtures.docx');
      if (corrupt > 0) {
        // Replace the last `corrupt` blobs with non-docx bytes; the real
        // converter fails those jobs while the rest convert normally.
        const bad = new Blob(['not a real docx'], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const gf = useGeneratorStore.getState().generatedFiles;
        const next = gf.map((f, i) => (i >= gf.length - corrupt ? { ...f, blob: bad } : f));
        useGeneratorStore.setState({ generatedFiles: next });
      }
      setReady(true);
    })();
  }, [n, corrupt]);

  if (!ready) return <div data-testid="dev-seeding">Seeding</div>;
  return <DoneView />;
}
