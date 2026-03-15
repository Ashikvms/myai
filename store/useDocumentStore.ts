import { create } from 'zustand';
import { Document, DocumentCategory } from '../types';

interface DocumentState {
  documents: Document[];
  selectedCategory: DocumentCategory;
  setCategory: (category: DocumentCategory) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  getFilteredDocuments: () => Document[];
}

const demoDocuments: Document[] = [
  {
    id: '1',
    title: 'Electric Bill - March 2026',
    category: 'bills',
    dateAdded: '2026-03-10',
    fileSize: '245 KB',
    description: 'Monthly electricity bill from Pacific Power',
  },
  {
    id: '2',
    title: 'Annual Physical Report',
    category: 'medical',
    dateAdded: '2026-02-28',
    fileSize: '1.2 MB',
    description: 'Results from annual health checkup',
  },
  {
    id: '3',
    title: 'Auto Insurance Policy',
    category: 'insurance',
    dateAdded: '2026-01-15',
    fileSize: '3.4 MB',
    description: 'Full coverage auto insurance policy document',
  },
  {
    id: '4',
    title: 'W-2 Form 2025',
    category: 'tax',
    dateAdded: '2026-01-31',
    fileSize: '156 KB',
    description: 'Wage and tax statement for 2025',
  },
  {
    id: '5',
    title: 'Apartment Lease Agreement',
    category: 'legal',
    dateAdded: '2025-09-01',
    fileSize: '2.8 MB',
    description: 'Residential lease agreement - 12 month term',
  },
  {
    id: '6',
    title: 'Dental Insurance Card',
    category: 'insurance',
    dateAdded: '2026-01-05',
    fileSize: '98 KB',
    description: 'Delta Dental insurance member card',
  },
];

const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: demoDocuments,
  selectedCategory: 'all',
  setCategory: (category) => set({ selectedCategory: category }),
  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),
  deleteDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),
  getFilteredDocuments: () => {
    const { documents, selectedCategory } = get();
    if (selectedCategory === 'all') return documents;
    return documents.filter((d) => d.category === selectedCategory);
  },
}));

export default useDocumentStore;
