// app/admin/map-editor/page.tsx
import { AdminMapEditor } from '@/components/admin/admin-map-editor';

export const metadata = {
  title: 'Editor Administrativo de Mapas | Lume 5e',
  description: 'Editor administrativo para mapeamento de zonas de colisão e teste tático de pathfinding.'
};

export default function AdminMapEditorPage() {
  return <AdminMapEditor />;
}
