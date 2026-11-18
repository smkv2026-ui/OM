import { CHAKRAS } from '../data';
import { Yantra } from '../yantras/Yantra';

/** Dev-only: all yantras side by side for visual QA (not routed in production). */
export default function DevGallery() {
  return (
    <div className="scroll-y grid flex-1 grid-cols-4 gap-4 p-4">
      {CHAKRAS.map((c) => (
        <div key={c.id} className="glass rounded-2xl p-2 text-center">
          <div className="aspect-square">
            <Yantra chakra={c} variant="detail" onPetal={() => {}} />
          </div>
          <p className="text-sm">{c.name}</p>
        </div>
      ))}
    </div>
  );
}
