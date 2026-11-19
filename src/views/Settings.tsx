import { DownloadIcon } from '../components/Icons';
import { PosePicker } from '../components/PosePicker';
import { TopBar, useInstall } from '../components/Shell';
import { Section, Segmented, Toggle } from '../components/ui';
import { useAudioClips } from '../engine/audioStore';
import { devanagariVoice } from '../engine/sequencer';
import { useOnline } from '../lib/hooks';
import { useSettings, type MotionPref, type Theme } from '../lib/store';
import { toggleTheme } from '../lib/theme';

export default function Settings() {
  const s = useSettings();
  const clips = useAudioClips((c) => c.clips);
  const clearClip = useAudioClips((c) => c.clearClip);
  const { canInstall, install } = useInstall();
  const online = useOnline();
  const voice = typeof window !== 'undefined' ? devanagariVoice() : null;
  const standalone = matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="Settings" subtitle="Appearance, meditation pose, motion, sound and data" />
      <div className="scroll-y min-h-0 flex-1 px-4 pb-10 lg:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-7">
          <Section title="Appearance">
            <Segmented<Theme>
              label="Theme"
              value={s.theme}
              onChange={(t) => t !== s.theme && toggleTheme()}
              options={[
                { value: 'dark', label: 'Dark · cosmic' },
                { value: 'light', label: 'Light · parchment' },
              ]}
            />
          </Section>
          <Section title="Meditation pose">
            <PosePicker />
          </Section>
          <Section title="Motion">
            <Segmented<MotionPref>
              label="Motion"
              value={s.motion}
              onChange={s.setMotion}
              options={[
                { value: 'system', label: 'System' },
                { value: 'reduce', label: 'Reduced' },
                { value: 'full', label: 'Full' },
              ]}
            />
            <p className="text-xs text-faint">Reduced motion stills the yantras, slows the simulator and shows static arrows for the prāṇa flows.</p>
          </Section>
          <Section title="Sound">
            <div className="glass rounded-xl px-3">
              <Toggle id="voice" label="Speak petal letters with a system voice (Chant / Matrika)" checked={s.chantVoice} onChange={s.setChantVoice} />
            </div>
            <p className="text-xs text-faint">
              {voice ? `Using “${voice.name}” (${voice.lang}).` : 'No Hindi/Sanskrit voice found on this device — a soft tone is played instead.'} Your recorded sounds are stored only on this device.
            </p>
            {Object.keys(clips).length > 0 && (
              <button className="btn" onClick={() => Object.keys(clips).forEach((k) => clearClip(k))}>
                Delete {Object.keys(clips).length} saved sound{Object.keys(clips).length > 1 ? 's' : ''}
              </button>
            )}
          </Section>
          <Section title="Library">
            <button className="btn" disabled={!s.bookmarks.length} onClick={s.clearBookmarks}>
              Clear {s.bookmarks.length} bookmark{s.bookmarks.length === 1 ? '' : 's'}
            </button>
          </Section>
          <Section title="App">
            <div className="glass flex flex-col gap-1 rounded-xl px-4 py-3 text-sm">
              <span>
                Status: <strong>{online ? 'Online' : 'Offline'}</strong> — everything works offline once the app has loaded.
              </span>
              <span>Installed: {standalone ? 'yes' : 'no'}</span>
            </div>
            {canInstall && (
              <button className="btn btn-gold" onClick={install}>
                <DownloadIcon size={18} /> Install Om
              </button>
            )}
            {!canInstall && !standalone && <p className="text-xs text-faint">On iOS: Share → Add to Home Screen. On desktop Chrome/Edge: the install icon in the address bar.</p>}
          </Section>
          <Section title="About">
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
              <p>
                Om is a study companion for the subtle anatomy of yoga: the three principal nāḍīs, the seven cakras and the five prāṇas. All figures are original vector redrawings; the scanned book figures were used only as tracing and layout references and are not included.
              </p>
              <p>Library entries quote verses only where the attribution is secure. Entries or verses marked “needs verification” should be checked against a critical edition. This app is not medical advice.</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
