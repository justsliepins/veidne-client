import { useState } from 'react';
import type { GeneratedFile } from '../../store/generatorStore';
import { FileItem } from './FileItem';
import { useStyles } from './FileList.styles';

const ITEMS_PER_PAGE = 6;

interface FileListProps {
  files: GeneratedFile[];
  onDownloadFile: (index: number) => void;
}

export function FileList({ files, onDownloadFile }: FileListProps) {
  const s = useStyles();
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageFiles = files.slice(start, start + ITEMS_PER_PAGE);

  return (
    <div>
      <div className={s.root}>
        {pageFiles.map((file, i) => (
          <FileItem key={start + i} name={file.name} size={file.blob.size}
            onDownload={() => onDownloadFile(start + i)} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className={s.pagination}>
          <button type="button" className={s.arrow}
            disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            {'\u2039'}
          </button>
          <span className={s.currentPage}>{currentPage}</span>
          <span className={s.pageText}>of</span>
          <span className={s.pageText}>{totalPages}</span>
          <button type="button" className={s.arrow}
            disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            {'\u203A'}
          </button>
        </div>
      )}
    </div>
  );
}
