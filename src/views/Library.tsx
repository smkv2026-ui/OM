import { TopBar } from '../components/Shell';
export default function Library({ route }: { route: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="Library" subtitle={route} />
    </div>
  );
}
