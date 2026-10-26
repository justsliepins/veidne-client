import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Veidne` : 'Veidne';
    return () => { document.title = 'Veidne'; };
  }, [title]);
}
