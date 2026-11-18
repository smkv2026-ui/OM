import { useRef, useState } from 'react';
import { audioKey, recorderMime, useAudioClips } from '../engine/audioStore';
import { CloseIcon, MicIcon, StopIcon, UploadIcon } from './Icons';

export interface SensorLike {
  id: string;
  name: string;
  color: string;
}

/**
 * Per-sensor audio: upload a file or record from the microphone, keyed `<count>_<sensorId>`
 * (the prototype's scheme), with a clear button for each.
 */
export function SensorAudioList({ sensors, count }: { sensors: SensorLike[]; count: number }) {
  const clips = useAudioClips((s) => s.clips);
  const setClip = useAudioClips((s) => s.setClip);
  const clearClip = useAudioClips((s) => s.clearClip);
  const [recId, setRecId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  const toggleRecord = async (id: string) => {
    setErr(null);
    if (recorder.current && recId === id) {
      recorder.current.stop();
      return;
    }
    if (recorder.current) return; // one recording at a time
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = recorderMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
        recorder.current = null;
        setRecId(null);
        void setClip(audioKey(count, id), blob, 'Voice recording');
      };
      recorder.current = rec;
      setRecId(id);
      rec.start();
    } catch {
      setErr('Microphone access was denied or is unavailable. You can upload an audio file instead.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {sensors.map((s) => {
        const clip = clips[audioKey(count, s.id)];
        const recording = recId === s.id;
        return (
          <div key={s.id} className="glass flex items-center gap-2 rounded-xl px-3 py-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{s.name}</span>
              <span className="block truncate text-[0.7rem] text-faint">{recording ? 'Recording…' : clip ? clip.name : 'No audio'}</span>
            </span>
            <label className="btn btn-icon !min-h-10 !w-10 cursor-pointer" title="Upload audio file" aria-label={`Upload audio for ${s.name}`}>
              <UploadIcon size={16} />
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void setClip(audioKey(count, s.id), f, f.name);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              className="btn btn-icon !min-h-10 !w-10"
              onClick={() => toggleRecord(s.id)}
              aria-pressed={recording}
              aria-label={recording ? `Stop recording ${s.name}` : `Record audio for ${s.name}`}
              style={recording ? { color: 'var(--magenta)', borderColor: 'var(--magenta)' } : undefined}
            >
              {recording ? <StopIcon size={14} /> : <MicIcon size={16} />}
            </button>
            {clip && (
              <button className="btn btn-icon !min-h-10 !w-10" onClick={() => clearClip(audioKey(count, s.id))} aria-label={`Clear audio for ${s.name}`}>
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        );
      })}
      {err && (
        <p role="alert" className="text-xs" style={{ color: 'var(--magenta)' }}>
          {err}
        </p>
      )}
    </div>
  );
}
